
import os

log_file = 'app.log'
if not os.path.exists(log_file):
    print("app.log not found")
else:
    with open(log_file, 'rb') as f:
        f.seek(0, 2)
        size = f.tell()
        read_size = min(size, 20000) # Read last 20KB
        f.seek(-read_size, 2)
        data = f.read()
        print(data.decode('utf-8', errors='ignore'))
