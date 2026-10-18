import docx
doc = docx.Document(r"C:\Users\guill\AppData\Local\Temp\opencode\uploads\230bd967-b94c-434e-8eb4-dcd8f49e315a\image.png")
for para in doc.paragraphs:
    print(para.text)