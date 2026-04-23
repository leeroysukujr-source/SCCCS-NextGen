
import sys

def fix_css():
    file_path = r'c:\Users\PC\Desktop\dd\frontend\src\pages\DirectMessages.css'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    sidebar_style = """  .dm-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    height: calc(100% - 130px);
    width: 280px;
    transform: translateX(-100%);
    box-shadow: 20px 0 60px rgba(0,0,0,0.5);
  }

  .dm-sidebar.open {
    transform: translateX(0);
  }"""

    start_marker = '@media (max-width: 768px) {'
    if start_marker in content:
        start_idx = content.find(start_marker)
        end_marker = '.dm-sidebar-header {'
        end_idx = content.find(end_marker, start_idx)
        
        if end_idx != -1:
            new_content = content[:start_idx] + start_marker + "\n" + sidebar_style + "\n}\n\n" + content[end_idx:]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully updated DirectMessages.css")

if __name__ == '__main__':
    fix_css()
