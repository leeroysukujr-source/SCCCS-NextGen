
import sys

def fix_css():
    file_path = r'c:\Users\PC\Desktop\dd\frontend\src\pages\Chat.css'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the block we want to ensure is present inside the media query
    sidebar_style = """  .chat-sidebar {
    width: 300px !important;
    max-width: 85vw !important;
    position: fixed;
    z-index: 2005;
    left: -100%;
    top: 60px; /* Below top-navbar */
    height: calc(100% - 130px); /* Fill space between 60px top and 70px bottom */
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    background: var(--bg-glass-strong) !important;
    backdrop-filter: blur(30px);
  }

  .chat-sidebar.open {
    left: 0;
    transform: translateX(0);
    box-shadow: 20px 0 60px rgba(0,0,0,0.7);
  }"""

    # Let's just rewrite the whole media query block for 768px
    # We'll find the first @media (max-width: 768px) and replace its content until the next major section
    
    start_marker = '@media (max-width: 768px) {'
    if start_marker in content:
        start_idx = content.find(start_marker)
        # Find the matching closing brace (this is tricky with nested braces, but we know this file)
        # Let's find the start of .sidebar-header or next section
        end_marker = '.sidebar-header {'
        end_idx = content.find(end_marker, start_idx)
        
        if end_idx != -1:
            new_content = content[:start_idx] + start_marker + "\n" + sidebar_style + "\n}\n\n" + content[end_idx:]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully updated Chat.css")

if __name__ == '__main__':
    fix_css()
