import json
import subprocess
import sys
import urllib.request

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
stdout, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
creds = dict(line.split('=', 1) for line in stdout.strip().splitlines() if '=' in line)
token = creds.get('password')

run_id = sys.argv[1] if len(sys.argv) > 1 else '43288048003'

req = urllib.request.Request(
    f'https://api.github.com/repos/ANSUJKMEHER/sentinelpay/actions/runs/{run_id}/jobs',
    headers={
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SentinelPay-Setup'
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        for j in data.get('jobs', []):
            print(f"Job: {j.get('name')} | Status: {j.get('status')} | Conclusion: {j.get('conclusion')}")
            for s in j.get('steps', []):
                print(f"   Step: {s.get('name')} | Status: {s.get('status')} | Conclusion: {s.get('conclusion')} | Started: {s.get('started_at')} | Completed: {s.get('completed_at')}")
except Exception as e:
    print('Error:', e)
