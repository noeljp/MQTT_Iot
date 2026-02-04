#!/usr/bin/env python3
"""
MQTT ACL Management Helper Script
"""
import sys
import subprocess

def write_acl_file(content):
    """Write content to ACL file using sudo tee"""
    try:
        process = subprocess.Popen(
            ['sudo', 'tee', '/etc/mosquitto/acl'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=content)
        
        if process.returncode != 0:
            print(f"Error writing ACL file: {stderr}", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: update_acl.py <content>")
        sys.exit(1)
    
    content = sys.argv[1]
    if write_acl_file(content):
        print("ACL file updated successfully")
        sys.exit(0)
    else:
        sys.exit(1)
