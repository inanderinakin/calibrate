import pandas as pd
import re

class EscoNormalizer:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.uri_lookup = {}
        self.label_to_uri_map = {}
        
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
        
        text = text.lower()
        
        translation_table = str.maketrans({
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u'
        })
        text = text.translate(translation_table)
        
        text = re.sub(r'\s+', '', text).strip()
        
        return text

    def _load_esco_data(self):
        """
        T2.1: Loads the ESCO CSV file, applies cleaning to both TR and EN labels,
        and builds URI-keyed lookup and label-to-URI maps.
        """
        try:
            df = pd.read_csv(self.csv_path)
            preferred_labels = []
            alt_labels = []
            for _, row in df.iterrows():
                uri = row.get('conceptUri') or row.get('URI')
                if not uri:
                    continue

                cleaned_labels = []
                
                if 'preferredLabel' in row and pd.notna(row['preferredLabel']):
                    cleaned_label = self._clean_text(str(row['preferredLabel']))
                    if cleaned_label:
                        preferred_labels.append((cleaned_label, uri))
                        cleaned_labels.append(cleaned_label)
                
                if 'altLabels' in row and pd.notna(row['altLabels']):
                    split_labels = str(row['altLabels']).split('\n')
                    for label in split_labels:
                        cleaned_label = self._clean_text(str(label))
                        if cleaned_label:
                            alt_labels.append((cleaned_label, uri))
                            cleaned_labels.append(cleaned_label)

                self.uri_lookup[uri] = list(set(cleaned_labels))

            for label, uri in preferred_labels:
                self.label_to_uri_map[label] = uri

            for label, uri in alt_labels:
                self.label_to_uri_map.setdefault(label, uri)
                    
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
            
            return self.label_to_uri_map.get(cleaned_input, None)
            
        except Exception:
            return None
