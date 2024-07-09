# multiplayer-zetamac

Follow the following instructions to setup:

```bash
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
```

Then, run the following in separate terminal instances

```bash
python server/server.py
```

```bash
cd client && python -m http.server
```

Go to `localhost:8000` and enjoy.