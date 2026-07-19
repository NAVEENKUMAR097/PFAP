import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:8000/health', timeout=5)
    data = json.loads(response.read())
    print("Health check response:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
