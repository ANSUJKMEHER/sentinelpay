import json
import subprocess
import sys
import urllib.request

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
stdout, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
creds = dict(line.split('=', 1) for line in stdout.strip().splitlines() if '=' in line)
token = creds.get('password')

run_id = sys.argv[1] if len(sys.argv) > 1 else None

headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SentinelPay-Setup'
}

if not run_id:
    # Fetch latest run
    req_runs = urllib.request.Request('https://api.github.com/repos/ANSUJKMEHER/sentinelpay/actions/runs?per_page=5', headers=headers)
    with urllib.request.urlopen(req_runs) as resp:
        runs_data = json.loads(resp.read().decode())
    runs = runs_data.get('workflow_runs', [])
    for r in runs:
        print(f"Run ID: {r['id']} | SHA: {r['head_sha'][:7]} | Status: {r['status']} | Conclusion: {r['conclusion']} | Event: {r['event']} | Branch: {r.get('head_branch')}")
    if runs:
        run_id = runs[0]['id']
        print(f"\n--- Details for latest Run {run_id} ({runs[0]['head_sha'][:7]}) ---")
    else:
        print("No workflow runs found.")
        sys.exit(0)

req = urllib.request.Request(
    f'https://api.github.com/repos/ANSUJKMEHER/sentinelpay/actions/runs/{run_id}/jobs',
    headers=headers
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        for j in data.get('jobs', []):
            print(f"Job: {j.get('name')} (ID: {j.get('id')}) | Status: {j.get('status')} | Conclusion: {j.get('conclusion')}")
            for s in j.get('steps', []):
                print(f"   Step: {s.get('name')} | Status: {s.get('status')} | Conclusion: {s.get('conclusion')} | Started: {s.get('started_at')} | Completed: {s.get('completed_at')}")
except Exception as e:
    print('Error:', e)

if len(sys.argv) > 2 and sys.argv[2] == '--log':
    target_job_id = sys.argv[3]
    log_req = urllib.request.Request(
        f'https://api.github.com/repos/ANSUJKMEHER/sentinelpay/actions/jobs/{target_job_id}/logs',
        headers=headers
    )
    class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            new_req = super().redirect_request(req, fp, code, msg, headers, newurl)
            if new_req is not None and "Authorization" in new_req.headers:
                del new_req.headers["Authorization"]
            return new_req
    opener = urllib.request.build_opener(SafeRedirectHandler())
    try:
        with opener.open(log_req) as resp:
            lines = resp.read().decode('utf-8', errors='ignore').splitlines()
            print(f"\n--- Last 50 lines of Job {target_job_id} Log ---")
            for line in lines[-50:]:
                print(line)
    except Exception as e:
        print(f"Could not fetch log: {e}")
