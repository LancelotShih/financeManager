import os
import sys


# Get the directory where the executable/script is located
base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
# Reference the parent directory of the current directory
parent_dir = os.path.dirname(base_dir)
app_path = os.path.join(base_dir, "app.py")

# Use the absolute path to app.py, so it works regardless of working directory or PyInstaller bundle location
os.system(f'streamlit run "{os.path.abspath(app_path)}"')