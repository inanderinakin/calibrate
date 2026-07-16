from pathlib import Path
import pandas as pd
from normalizer import EscoNormalizer

csv_path = Path(Path(__file__).parent.parent/"normalizer"/"esco_dataset"/"skills_en.csv")

df = pd.read_csv(csv_path)

print(len(df.index))

print(df["preferredLabel"].head(10))

normalizer = EscoNormalizer(csv_path = csv_path)

print(len(normalizer.label_to_uri_map))

print(normalizer.normalize_skill("Python"))
print(normalizer.normalize_skill("SQL"))
print(normalizer.normalize_skill("Haskell"))
print(normalizer.normalize_skill("veri bilimi"))
print(normalizer.normalize_skill("Python 3K"))