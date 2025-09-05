# integration test
import sys
import json

# message = sys.argv[1]

# print(f"Message from Node.js: {message}")

# print("This is a test file.")

json_obj = json.dumps({"nodes": 159, "edges": 1025, "degree": 12.34, "limit": 100})
print(json_obj) 

sys.stdout.flush()