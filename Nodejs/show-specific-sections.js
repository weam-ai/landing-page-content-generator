require('dotenv').config();
const FigmaAPI = require('./src/utils/figmaApi');

async function showSpecificSections() {
  console.log('🎯 Showing SPECIFIC MEANINGFUL SECTIONS...\n');
  
  if (!process.env.FIGMA_ACCESS_TOKEN) {
    console.error('❌ FIGMA_ACCESS_TOKEN not found');
    return;
  }
  
  try {
    const figmaApi = new FigmaAPI(process.env.FIGMA_ACCESS_TOKEN);
    
    const yourUrl = 'https://www.figma.com/design/XrnfuSSzTKnLjU1Lq35hfE/Whitepace---SaaS-Landing-Page--Community-?node-id=103-52141&t=yqmLS2sXchUgphOL-1';
    const fileKey = figmaApi.extractFileKey(yourUrl);
    
    const figmaFile = await figmaApi.getFile(fileKey);
    const sections = figmaApi.analyzeDesignStructure(figmaFile.document);
    
    // Filter for meaningful sections (exclude layout/technical sections)
    const meaningfulSections = sections.filter(section => {
      const name = section.title.toLowerCase();
      return !name.includes('landing page') && 
             !name.includes('desktop') && 
             !name.includes('tablet') && 
             !name.includes('mobile') &&
             !name.includes('responsive') &&
             !name.includes('resize') &&
             !name.includes('ruler');
    });
    
    console.log(`📋 Meaningful Sections Found: ${meaningfulSections.length}`);
    console.log('\n🎯 KEY SECTIONS FOR YOUR LANDING PAGE:');
    console.log('=====================================');
    
    meaningfulSections.slice(0, 30).forEach((section, index) => {
      console.log(`  ${index + 1}. ${section.title}`);
    });
    
    if (meaningfulSections.length > 30) {
      console.log(`... and ${meaningfulSections.length - 30} more meaningful sections`);
    }
    
    console.log('🎉 These are the CLEAN sections you can use in your landing page builder!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

showSpecificSections();
