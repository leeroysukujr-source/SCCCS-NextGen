
import sys

def fix_css():
    with open(r'c:\Users\PC\Desktop\dd\frontend\src\pages\Chat.css', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    found_media = False
    for i, line in enumerate(lines):
        new_lines.append(line)
        if '@media (max-width: 768px)' in line:
            found_media = True
        if found_media and '.chat-sidebar {' in line:
            # Look for the closing brace of .chat-sidebar
            j = i + 1
            while j < len(lines) and '}' not in lines[j]:
                j += 1
            if j < len(lines):
                # Insert .chat-sidebar.open after .chat-sidebar
                new_lines.extend(lines[i+1:j+1])
                new_lines.append('\n')
                new_lines.append('  .chat-sidebar.open {\n')
                new_lines.append('    left: 0;\n')
                new_lines.append('    transform: translateX(0);\n')
                new_lines.append('    box-shadow: 20px 0 60px rgba(0,0,0,0.7);\n')
                new_lines.append('  }\n')
                # Skip the lines we already added
                new_lines.extend(lines[j+1:])
                break
    
    with open(r'c:\Users\PC\Desktop\dd\frontend\src\pages\Chat.css', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

if __name__ == '__main__':
    fix_css()
