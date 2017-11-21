// 1 引入各种包及核心对象

//  引入express框架，并创建服务器
const express = require('express')
let app = express()
//  配置模板引擎
app.engine('html', require('express-art-template'))
//  引入数据库对象,以及连接池,建立与服务器的连接
const mysql = require('mysql')
const pool = mysql.createPool({
  connectionLimit: 10,
  host: '127.0.0.1',
  user: 'root',
  password: 'ztw526',
  database: 'album'
})
//  引入path核心对象
const path = require('path')
//解析post请求体数据
const bodyParser = require('body-parser');
//  引入文件功能增强包
const fse = require('fs-extra')
//  引入解析上传文件包
const formidable = require('formidable')


// 2 配置路由器，并测试
let router = express.Router()

router.get('/test', (req, res, next) => {
  //创建连接池的连接
  pool.getConnection((error, connection) => {
    //开始查询
    connection.query('select * from album_dir', (error, results, fields) => {
      //查询后释放连接
      connection.release()
      if (error) throw error
      res.render('test.html', { text: results[2].dir })
    })
  })
})
  //获得相册列表
  .get('/', (req, res, next) => {
    //创建连接池的连接
    pool.getConnection((error, connection) => {
      //开始查询
      connection.query('select * from album_dir', (error, results, fields) => {
        //查询后释放连接
        connection.release()
        if (error) return next(error)
        // console.log(results)
        res.render('index.html', { album: results })
      })
    })
  })
  // 获得照片列表
  .get('/getPic', (req, res, next) => {
    let dirname = req.query.dir
    //创建连接池的连接
    pool.getConnection((error, connection) => {
      //开始查询
      connection.query('select * from album_file where dir = ?', [dirname], (error, results, fields) => {
        //查询后释放连接
        connection.release()
        if (error) return next(error)
        // console.log(results)
        res.render('album.html', { album: results, dir: dirname })
      })
    })
  })
  //添加相册
  .post('/addDir', (req, res, next) => {
    let dirname = req.body.dirname
    console.log(req.body)
    //创建连接池的连接
    pool.getConnection((error, connection) => {
      //开始查询
      connection.query('insert into album_dir values (?)', [dirname], (error, results, fields) => {
        //查询后释放连接
        connection.release()
        if (error) return next(error)
        //创建本地目录
        const dir = `./resource/${dirname}`
        fse.ensureDir(dir, err => {
          //重定向,直接进入相册内部
          res.redirect('/getPic?dir=' + dirname)
        })

      })
    })
  })
  // 添加照片
  .post('/addPic', (req, res, next) => {
    let form = new formidable.IncomingForm()
    //console.log(form)
    //console.log(__dirname)
    let rootPath = path.join(__dirname, 'resource')
    //设置默认上传目录
    form.uploadDir = rootPath
    form.parse(req, (err, fields, files) => {
      if (err) return next(err)

      let filename = path.parse(files.picname.path).base
      //console.log(filename)
      let dist = path.join(rootPath, fields.dir, filename);
      //移动文件
      fse.move(files.picname.path, dist, (err) => {
        if (err) return next(err)

        let db_file = `/resource/${fields.dir}/${filename}`
        let db_dir = fields.dir

        pool.getConnection((err, connection) => {
          //处理获取连接时的异常，比如停网了
          if (err) return next(err);
          //使用连接查询所有的album_dir所有数据
          connection.query('insert into album_file values (?,?)', [db_file, db_dir], (error, results) => {

            //查询完毕以后，释放连接
            connection.release();
            //处理查询时带来的异常，比如表名错误
            if (err) return next(err);
            //重定向到看相片的页面
            res.redirect('/getPic?dir=' + db_dir);
          })
        });

      })
    })
  })
// 使用路由器中间间处理数据请求
// 4 暴露静态资源
app.use('/public', express.static('./public'))
app.use('/resource', express.static('./resource'))
// 中间件执行列表
//解析表单请求二进制编码
app.use(bodyParser.urlencoded({ extended: false }))
//解析json格式数据
app.use(bodyParser.json())
app.use(router)
// 3 开启服务器监听
app.listen(8888, () => {
  console.log('服务器启动了')
})

// 5 处理err异常（错误处理中间件）



