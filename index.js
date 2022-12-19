import fs from 'fs';
import { encode } from 'gpt-3-encoder';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const storeEmbeddedData = (folderDirectory,fileName,embedData)=>{
  if(!fs.existsSync(folderDirectory)){
    fs.mkdir(`${folderDirectory}`, (error) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Folder created successfully');
      }
    });
  }
  
  fs.writeFile(`${folderDirectory}/${fileName}.json`, JSON.stringify(embedData), (error) => {
    if (error) {
      console.error(error);
    } else {
      console.log('File saved successfully');
    }
  });
}

const getFilesData =  (directory)=>{
  const filesData = [];
  const filesInFolder = fs.readdirSync(directory);
  const selectedFiles = filesInFolder.splice(0,filesInFolder.length,1);
  for (const file of selectedFiles){
    const fileName = file.split(".")[0];
     const data = fs.readFileSync(`${directory}/${file}`);
     const {title,content} =JSON.parse(data);
      const contentList  = content.split("\n").join(" ");
      filesData.push({id:fileName,title,content:contentList});
  }
  return filesData;
}


const getSingleFileEmbedData = async(fileData)=>{
  const {title,content} = fileData;
  const embedInputFileData = {title,content};
  const dataKeys =Object.keys(embedInputFileData);
  const singleFileEmbedData = {id:fileData.id};
  for(const key of dataKeys){
    const embedString = embedInputFileData[key];
    const embedStringTokenSize = encode(embedString).length;
    const tokenLimit = 8192;
    const subStrings = [];

    if(embedStringTokenSize>tokenLimit){
      const numberOfSubString = Math.ceil(embedStringTokenSize/tokenLimit);
      const stringLength = embedString.length;
      const subStringLength =Math.ceil(stringLength/numberOfSubString);
      for (let i = 0; i < stringLength; i += subStringLength) {
        const subString = embedString.slice(i, i+subStringLength);
        subStrings.push(subString);
      }
    }
    const gptResponse = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: subStrings.length?subStrings:embedString,
    });

      const {data} = gptResponse.data;
      const embeddedList = [];
      for(const item of data ){
        embeddedList.push(item.embedding);
      }
      singleFileEmbedData[key] = {text:embedString,embed:embeddedList};
  }
  
  return singleFileEmbedData;
}

const getSingleFolderEmbedData = async()=>{
  const rawDatafolderDirectory = './assets/raw-data/delphia';
  const embedDatafolderDirectory = rawDatafolderDirectory.replace("raw","embedded");
  const embeddedData =[];
  const inputDataOfSelectedFiles = getFilesData(rawDatafolderDirectory);

  for (const fileData of inputDataOfSelectedFiles){
    const result = await getSingleFileEmbedData(fileData);
    embeddedData.push(result);
}

  for(const data of embeddedData){
    const {id,title,content}=data;
    storeEmbeddedData(embedDatafolderDirectory,id,{title,content});
  }
}

getSingleFolderEmbedData();

