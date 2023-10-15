const express = require('express')
const {MongoClient, ObjectId} = require('mongodb')
const cors = require('cors')
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs')


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Указать папку назначения для загрузки файлов
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Имя файла, сохраненное на сервере
    const originalname = file.originalname;
    const filename = originalname;
    cb(null, filename);
  }
});

// Создать экземпляр multer и указать конфигурацию хранения
const upload = multer({ storage: storage });

const MongoDBclient = new MongoClient('mongodb://127.0.0.1:27017')

// коды товаров | папки
const baseCode = {
    '#1' : 'uploads/pizza/',
    '#2' : 'uploads/shaurma/',
    '#3' : 'uploads/soup/',
    '#4' : 'uploads/fries/',
    '#5' : 'uploads/salad/',
    '#6' : 'uploads/wok/',
    '#7' : 'uploads/drinks/',
    '#8' : 'uploads/rolls/'
}

// ициализация express + cors + bodyParser
const app = express()
app.use(cors())
app.use(bodyParser.json());

const port = 5000

const reTest = async () =>{
    try {
        await MongoDBclient.connect()
        console.log("Успешно подключились к базе данных")
        await MongoDBclient.close()
        console.log("Закрыли подключение")
    } catch (e) {
        console.log(e)
    }
 }
 reTest()


app.get('/', (req, res) => {
  res.send('success')
})

app.delete('/loadfoods/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await MongoDBclient.connect();
    const exployees = MongoDBclient.db('foodband').collection('foodsmenu');
    
    const filter = { _id: new ObjectId(id) }
    const thisFile = await exployees.find(filter).toArray();
    const decodedPath = decodeURIComponent(thisFile[0].imgFile);
    const imagePath = path.join(__dirname, decodedPath);
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.log('Ошибка удаления файла: ' + err)
      } else {
        console.log('Успешно!')
      }
    })

    const result = await exployees.deleteOne(filter);
    console.log("Удалено документов:", result.deletedCount);
    res.status(200).send("Документ успешно удален");
  } catch (error) {
    console.log('Ошибка при удалении документа:', error);
    res.status(500).send("Ошибка при удалении документа");
  } finally {
    console.log('Объект удалён, подключение закрыто')
    await MongoDBclient.close();
  }
});

app.post('/loadfoods', async (req, res) => {
    try {
      await MongoDBclient.connect()
      const exployees = MongoDBclient.db('foodband').collection('foodsmenu')
      const filter = { category: req.body.selectid }
      const allCategories = await exployees.find(filter).toArray()
      res.json(allCategories)
      console.log('Успешное получение!')
    }catch(err) {
      console.log('Ошибка получения: ' + err)
    }finally {
      console.log('Ответ отправлен, подключение закрыто')
      await MongoDBclient.close()
    }
})

app.get('/loadfoods/*', (req, res) => {
  const filepath = req.originalUrl.replace('/loadfoods/', '');
  const decodedPath = decodeURIComponent(filepath);

  const imagePath = path.join(__dirname, decodedPath);
  
  

  res.sendFile(imagePath);
});

app.post('/foods', upload.single('file'), async (req, res) => {
    // Получить файл
    const file = req.file;
    //оригинальное имя файла
    const originalName = file.filename;
    // расширение файла
    const extension = path.extname(originalName);
    // замена пробелов на _ с помощью экранирования
    const newName = req.body.named.replace(/ /g, '_') + req.body.category + extension;
    // Сохраняем файл с новым именем
    const actualUri = baseCode[req.body.category]   // актуальный URI с помощью идентификации #1 #2 ...
    const localFile = actualUri + newName
    const destinationPath = path.join(__dirname, localFile);  // адрес фильтрации по папкам
    fs.rename(req.file.path, destinationPath, (err) => {
      if (err) {
        console.log('Ошибка загрузки файла')
      } else {
        res.send('Загружено');
      }
    });
    const filePath = path.join(__dirname, actualUri, newName);

    console.log('Локальный путь: ' + localFile );
    console.log('Ид объекта: ' + req.body.category)
    console.log('Имя объекта: ' + req.body.named)

    const thisFood = {
      category: req.body.category,
      imgFile: encodeURIComponent(localFile),
      foodName: req.body.named,
      description: req.body.description,
      sizeS: req.body.sizeS,
      sizeM: req.body.sizeM,
      sizeL: req.body.sizeL,
    }

    // сохранение в бд 
    try {  
      await MongoDBclient.connect()
      console.log('Успешное подключение (POST)')

      const exployees = MongoDBclient.db('foodband').collection('foodsmenu')
      await exployees.insertOne(thisFood)
    } catch (err) {
      console.log('Ошибка сохранения в БД: ' + err)
    } finally {
      console.log('Товар добавлен!')
      await MongoDBclient.close()
    }

  })

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})