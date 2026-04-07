import sys
import traceback
from app import create_app, db
from app.models import SystemSetting

app = create_app()
with app.app_context():
    try:
        print(SystemSetting.query.all())
    except Exception as e:
        with open("tb.txt", "w") as f:
            traceback.print_exc(file=f)
