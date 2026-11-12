import logging
from typing import Literal, Optional
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    evidence_analysis_node,
    intake_node,
    investigation_node,
    policy_advisory_node,
    policy_engine_node,
    resolution_node,
    supervisor_node,
)
from app.agents.state import DisputeState

logger = logging.getLogger("sentinelpay.agents.graph")


def route_from_start(state: DisputeState) -> Literal["intake", "resolution"]:
    """
    Routing logic from graph entry:
    - If resuming from human approval checkpoint (human_approval_status == 'APPROVED'),
      bypass earlier intake/investigation and route directly to resolution for execution.
    - Otherwise, begin workflow at intake.
    """
    if state.get("human_approval_status") == "APPROVED":
        return "resolution"
    return "intake"


def route_after_intake(state: DisputeState) -> Literal["investigation", "__end__"]:
    if state.get("status") == "FAILED":
        return END
    return "investigation"


def route_after_investigation(state: DisputeState) -> Literal["evidence_analysis", "__end__"]:
    if state.get("status") == "FAILED":
        return END
    return "evidence_analysis"


def route_after_evidence(state: DisputeState) -> Literal["policy_advisory", "__end__"]:
    if state.get("status") == "FAILED":
        return END
    return "policy_advisory"


def route_after_supervisor(state: DisputeState) -> Literal["resolution", "__end__"]:
    # If suspended for human approval or failed/exceeded iterations, stop
    if state.get("status") in ["AWAITING_APPROVAL", "FAILED"]:
        return END
    return "resolution"


def build_dispute_graph(checkpointer: Optional[BaseCheckpointSaver] = None):
    """
    Constructs the governed multi-agent dispute workflow.
    Wires nodes, conditional gating, and state checkpointing.
    """
    workflow = StateGraph(DisputeState)

    # 1. Add agent nodes
    workflow.add_node("intake", intake_node)
    workflow.add_node("investigation", investigation_node)
    workflow.add_node("evidence_analysis", evidence_analysis_node)
    workflow.add_node("policy_advisory", policy_advisory_node)
    workflow.add_node("policy_engine", policy_engine_node)
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("resolution", resolution_node)

    # 2. Add controlled transitions
    workflow.add_conditional_edges(START, route_from_start)
    workflow.add_conditional_edges("intake", route_after_intake)
    workflow.add_conditional_edges("investigation", route_after_investigation)
    workflow.add_conditional_edges("evidence_analysis", route_after_evidence)
    workflow.add_edge("policy_advisory", "policy_engine")
    workflow.add_edge("policy_engine", "supervisor")
    workflow.add_conditional_edges("supervisor", route_after_supervisor)
    workflow.add_edge("resolution", END)

    if checkpointer is None:
        checkpointer = MemorySaver()

    return workflow.compile(checkpointer=checkpointer)


class PersistentDisputeOrchestrator:
    """
    Thread-safe orchestrator proxy that lazily binds to the persistent LangGraph checkpointer
    (AsyncSqliteSaver or AsyncPostgresSaver) configured in the application lifespan.
    Preserves seamless compatibility with `await dispute_orchestrator.ainvoke(...)`.
    """
    def __init__(self):
        self._graph = None

    async def _get_graph(self):
        if self._graph is None:
            from app.agents.checkpoint import init_global_checkpointer
            checkpointer = await init_global_checkpointer()
            self._graph = build_dispute_graph(checkpointer=checkpointer)
        return self._graph

    async def ainvoke(self, input_data, config=None, **kwargs):
        graph = await self._get_graph()
        return await graph.ainvoke(input_data, config=config, **kwargs)

    async def aget_state(self, config, **kwargs):
        graph = await self._get_graph()
        return await graph.aget_state(config, **kwargs)

    async def aupdate_state(self, config, values, as_node=None, **kwargs):
        graph = await self._get_graph()
        return await graph.aupdate_state(config, values, as_node=as_node, **kwargs)


# Application-level singleton orchestrator using persistent checkpointer
dispute_orchestrator = PersistentDisputeOrchestrator()
