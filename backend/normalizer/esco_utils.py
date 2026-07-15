import pandas as pd
import re

class EscoNormalizer:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.uri_lookup = {}
        self.label_to_uri_map = {}
        
        # Load the data and map them
        self._load_esco_data()

    def _clean_text(self, text: str) -> str:
        """
        Cleans the input text based on the requirements:
        - Case-insensitive (lowercase)
        - Turkish-diacritic-folding (maps TR characters to EN)
        - Whitespace-tolerant (strips boundaries and internal spaces)
        """
        if not isinstance(text, str):
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Turkish-diacritic-folding
        translation_table = str.maketrans({
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u'
        })
        text = text.translate(translation_table)
        
        # Remove all spaces (whitespace-tolerant) so 'veri tabani' matches 'veritabani'
        text = re.sub(r'\s+', '', text).strip()
        
        return text

    def _load_esco_data(self):
        """
        T2.1: Loads the ESCO CSV file, applies cleaning to both TR and EN labels,
        and builds URI-keyed lookup and label-to-URI maps.
        """
        try:
            df = pd.read_csv(self.csv_path)
            
            for _, row in df.iterrows():
                uri = row.get('conceptUri') or row.get('URI')
                if not uri:
                    continue
                
                # We collect both TR and EN labels
                labels = []
                if 'preferredLabel_tr' in row and pd.notna(row['preferredLabel_tr']):
                    labels.append(str(row['preferredLabel_tr']))
                if 'preferredLabel_en' in row and pd.notna(row['preferredLabel_en']):
                    labels.append(str(row['preferredLabel_en']))
                
                # If your CSV uses different names like preferredLabel, fallback to them
                if 'preferredLabel' in row and pd.notna(row['preferredLabel']):
                    labels.append(str(row['preferredLabel']))

                cleaned_labels = []
                for label in labels:
                    cleaned_label = self._clean_text(label)
                    if cleaned_label:
                        cleaned_labels.append(cleaned_label)
                        # Build the reverse lookup map on the fly
                        self.label_to_uri_map[cleaned_label] = uri
                
                if cleaned_labels:
                    self.uri_lookup[uri] = list(set(cleaned_labels))
                    
        except Exception as e:
            print(f"An error occurred while loading the ESCO dataset: {e}")

    def normalize_skill(self, text: str) -> str:
        """
        T2.2 Requirements:
        - Cleans the input text and queries the reverse search map.
        - Never raises an exception.
        - Returns None if no match is found.
        """
        try:
            if not text:
                return None
                
            cleaned_input = self._clean_text(text)
            
            # Fast O(1) lookup
            return self.label_to_uri_map.get(cleaned_input, None)
            
        except Exception:
            # Fallback to ensure "never raises" rule is strictly met
            return None