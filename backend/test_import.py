
try:
    from app.models.document import Document
    print("Document import successful")
except ImportError as e:
    print(f"ImportError: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"General Error: {e}")
    import traceback
    traceback.print_exc()
