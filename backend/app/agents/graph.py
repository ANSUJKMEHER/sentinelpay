from typing import Literal
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


def build_dispute_graph(checkpointer: MemorySaver = None):
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
    workflow.add_edge(START, "intake")
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


# Singleton compiled graph with memory checkpointer
memory_checkpointer = MemorySaver()
dispute_orchestrator = build_dispute_graph(checkpointer=memory_checkpointer)
