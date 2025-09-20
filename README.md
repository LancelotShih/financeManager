# financeManager
A small python app that you can enter your basic financial holdings and determine your net worth

# Usage
If you would just like to use the app, find the `.exe` file in releases

## Install Dependencies

To run this app, you need the following Python packages:

- streamlit
- yfinance
- pandas
- numpy
- requests
- sqlite3 (standard library)

You can install them with:

```
pip install streamlit yfinance pandas numpy requests
```

## Run the app
to run, head to the directory and run `streamlit run app.py`

## Command to Create the `.exe`
```
pyinstaller --onefile --add-data "../app.py;." --add-data "../db.py;." --add-data "../constants.py;." --add-data "../data_fetcher.py;." --add-data "../treasury.py;." --add-data "../retirement.py;." run_app.py
```