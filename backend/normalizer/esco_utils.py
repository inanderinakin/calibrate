import pandas as pd

class EscoNormalizer:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.uri_lookup = {}
        self.label_to_uri_map = {}
        
        # Load the data and map them
        self._load_esco_data()
        self._create_label_to_uri_map()

    def _load_esco_data(self):
        """T2.1: Loads the ESCO CSV file and builds a URI-keyed lookup dictionary."""
        try:
            df = pd.read_csv(self.csv_path)
            
            for _, row in df.iterrows():
                uri = row.get('conceptUri')
                if not uri:
                    continue
                    
                labels = []
                # Check with your own info language
                # Example: 'preferredLabel_tr' and 'preferredLabel_en'
                if 'preferredLabel_tr' in row and pd.notna(row['preferredLabel_tr']):
                    labels.append(str(row['preferredLabel_tr']).lower().strip())
                if 'preferredLabel_en' in row and pd.notna(row['preferredLabel_en']):
                    labels.append(str(row['preferredLabel_en']).lower().strip())
                    
                self.uri_lookup[uri] = list(set(labels))
        except Exception as e:
            print(f"An error occurred while loading the ESCO dataset: {e}")

    def _create_label_to_uri_map(self):
        """It creates a reverse search map using labels as keys."""
        for uri, labels in self.uri_lookup.items():
            for label in labels:
                self.label_to_uri_map[label] = uri

    def normalize_skill(self, text: str) -> str:
        """T2.2: Cleans the input text and returns the ESCO URI."""
        if not text:
            return None
            
        cleaned_text = str(text).lower().strip()
        
        # check for one to one match
        if cleaned_text in self.label_to_uri_map:
            return self.label_to_uri_map[cleaned_text]
            
        return None