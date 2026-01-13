# Common word list

Place your `google-10000-english-usa.txt` file from the Google word frequency list in this directory so the app can load it at runtime. The React code automatically reads `/data/google-10000-english-usa.txt` when available. If the file is missing, a built-in fallback list (a few hundred words) is used so the UI can still function.
