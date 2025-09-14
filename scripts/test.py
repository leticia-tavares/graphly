# integration test
import sys
import json

message = sys.argv[1]
# print(f"Received message: {message}")

json_obj = json.dumps({"nodes": 159, "edges": 1025, "degree": 12.34, "limit": 100})
print(json_obj) 

sys.stdout.flush()

# Keep the script running to listen for further messages
for line in sys.stdin:
    message = line.strip()

    if message == "":
        continue
    else:
        # do something with the message
        sys.stdout.flush()