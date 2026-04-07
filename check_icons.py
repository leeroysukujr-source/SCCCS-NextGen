import os
import re

def check_icons(directory):
    # Matches FiIcon used anywhere (as a tag <FiIcon or as a variable FiIcon)
    # Excludes the import declaration itself
    usage_pattern = re.compile(r'\bFi([A-Z][a-zA-Z0-9]+)\b')
    import_pattern = re.compile(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react-icons/fi[\'"]')
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Find all imported icons
                    imports = set()
                    for match in import_pattern.finditer(content):
                        # Extract the imported names, handling "as"
                        # e.g. "FiArrowLeft, FiPlus as Plus" -> imports = {"FiArrowLeft", "Plus"}
                        icons = [i.strip().split(' as ')[-1] for i in match.group(1).split(',')]
                        imports.update(icons)
                    
                    # Find all used icons
                    used_raw = set(usage_pattern.findall(content))
                    
                    # Real missing: the Fi{Icon} is used but not in imports
                    # And it's not the import line itself (which we already excluded by logic)
                    missing = set()
                    for icon in used_raw:
                        full_name = f"Fi{icon}"
                        # Check if full_name is in imports
                        if full_name not in imports:
                            # It could be that it's imported as something else, but here we check for the Fi prefix usage
                            # Also check if it's used in the code but not the import
                            # A simple way: check if it appears in the content outside of the import line
                            # But wait, our usage_pattern matches everything.
                            # Let's just check if the full_name is imported.
                            missing.add(full_name)
                    
                    if missing:
                        # Final filter: verify it's not just the import line
                        # We do this by seeing if it appears more times than in the import
                        real_missing = []
                        for m in missing:
                            # Count total occurrences
                            count = len(re.findall(r'\b' + m + r'\b', content))
                            # Count in imports
                            import_count = 0
                            for match in import_pattern.finditer(content):
                                if m in match.group(0):
                                    import_count += 1
                            
                            if count > import_count:
                                real_missing.append(m)
                        
                        if real_missing:
                            print(f"File: {path}")
                            print(f"  Missing Icons: {real_missing}")
                            print("-" * 20)

if __name__ == "__main__":
    check_icons(r'c:\Users\PC\Desktop\dd\frontend\src')
