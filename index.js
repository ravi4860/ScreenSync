const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'downloads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to save screenplay as Final Draft (.fdx) format
app.post('/api/save-screenplay', (req, res) => {
  try {
    const { title, content, filename } = req.body;
    
    if (!title || !content || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Final Draft XML structure
    const fdxContent = createFinalDraftXML(title, content);
    
    // Ensure downloads directory exists
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }
    
    const filepath = path.join(downloadsDir, `${filename}.fdx`);
    fs.writeFileSync(filepath, fdxContent);
    
    res.json({ 
      success: true, 
      message: 'Screenplay saved successfully',
      downloadUrl: `/download/${filename}.fdx`
    });
  } catch (error) {
    console.error('Error saving screenplay:', error);
    res.status(500).json({ error: 'Failed to save screenplay' });
  }
});

// Download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'downloads', filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Function to create Final Draft XML format
function createFinalDraftXML(title, content) {
  const lines = content.split('\n');
  let paragraphs = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const elementType = detectElementType(trimmedLine);
      paragraphs += `
        <Paragraph>
          <ScriptElement Type="${elementType}">
            <Text>${escapeXML(trimmedLine)}</Text>
          </ScriptElement>
        </Paragraph>`;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph>
      <ScriptElement Type="Scene Heading">
        <Text>FADE IN:</Text>
      </ScriptElement>
    </Paragraph>
    ${paragraphs}
    <Paragraph>
      <ScriptElement Type="Transition">
        <Text>FADE OUT.</Text>
      </ScriptElement>
    </Paragraph>
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Alignment="Center">
        <Text Style="Bold+Underline">${escapeXML(title)}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
}

// Function to detect screenplay element type
function detectElementType(line) {
  const upperLine = line.toUpperCase();
  
  // Scene headings
  if (upperLine.startsWith('INT.') || upperLine.startsWith('EXT.') || 
      upperLine.startsWith('FADE IN') || upperLine.startsWith('FADE OUT')) {
    return 'Scene Heading';
  }
  
  // Transitions
  if (upperLine.includes('CUT TO:') || upperLine.includes('DISSOLVE TO:') || 
      upperLine.includes('FADE TO:') || upperLine.endsWith('TO:')) {
    return 'Transition';
  }
  
  // Character names (all caps, centered-ish)
  if (upperLine === line && line.length < 30 && !line.includes('.') && 
      !line.includes('(') && line.split(' ').length <= 3) {
    return 'Character';
  }
  
  // Parentheticals
  if (line.startsWith('(') && line.endsWith(')')) {
    return 'Parenthetical';
  }
  
  // Default to Action
  return 'Action';
}

// Function to escape XML characters
function escapeXML(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
}

// Start server
app.listen(PORT, () => {
  console.log(`ScreenSync server running on http://localhost:${PORT}`);
  console.log('Open your browser and navigate to the URL above to start writing!');
});

module.exports = app;