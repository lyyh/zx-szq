var gulp = require('gulp'),
  autoprefixer = require('gulp-autoprefixer'),
  concat = require('gulp-concat'),
  imagemin = require('gulp-imagemin'),
  minifyHtml = require('gulp-minify-html'),
  rev = require('gulp-rev'),
  revCollector = require('gulp-rev-collector'),
  uglify = require('gulp-uglify'),
  connect = require('gulp-connect'),
  del = require("del"),
  less = require('gulp-less'),
  path = require('path'),
  plumber = require('gulp-plumber'),
  notify = require('gulp-notify'),
  babel = require('gulp-babel'),
  amdOptimize = require('amd-optimize'),
  rename = require('gulp-rename'),
  runsequence = require('run-sequence'),
  cssSprite = require('gulp-css-spritesmith');


/*生产构建 begin*/
// 处理CSS
gulp.task('css', function() {
  return gulp.src('src/**/*.css')
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist'));
});

//处理less
gulp.task('less', function() {
    return gulp.src('./src/**/*.less')
      .pipe(plumber({
        errorHandler: notify.onError('Error: <%= error.message %>')
      }))
      .pipe(less())
      .pipe(autoprefixer({
        browsers: ['last 2 versions', 'Firefox >= 20'],
        cascade: true, //是否美化属性值 默认：true 像这样：
        //-webkit-transform: rotate(45deg);
        //        transform: rotate(45deg);
        remove: true //是否去掉不必要的前缀 默认：true )
      }))
      .pipe(gulp.dest("dist"));
  })
  // 此处就不做CSS压缩的演示了，原理相同。

// 压缩js
gulp.task('script', function() {
  return gulp.src(['./src/**/*.js','!./src/**/*.min.js'])
    // .pipe(uglify())
    .pipe(gulp.dest('./src'));
});

// 自动雪碧图
// autoSprite, with media query
// gulp.task('autoSprite', function() {
//     gulp.src('src/**/*.css').pipe(cssSprite({
//         // sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
//         imagepath: 'src/images',
//         // 映射CSS中背景路径，支持函数和数组，默认为 null
//         imagepath_map: null,
//         // 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
//         spritedest: 'dist/images/',
//         // 替换后的背景路径，默认 ../images/
//         spritepath: '../../images/',
//         // 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
//         // padding: 2,
//         // 是否使用 image-set 作为2x图片实现，默认不使用
//         // useimageset: false,
//         // 是否以时间戳为文件名生成新的雪碧图文件，如果启用请注意清理之前生成的文件，默认不生成新文件
//         newsprite: false,
//         // 给雪碧图追加时间戳，默认不追加
//         spritestamp: false,
//         // 在CSS文件末尾追加时间戳，默认不追加
//         cssstamp: false
//     }))
//     .pipe(gulp.dest('src/'));
// });

// gulp.task('sprite', function() {

//     var timestamp = +new Date();
//     //需要自动合并雪碧图的样式文件
//     return gulp.src('./src/**/*.css')
//         .pipe(spriter({
//             // 生成的spriter的位置
//             'spriteSheet': './dist/images/sprite'+timestamp+'.png',
//             // 生成样式文件图片引用地址的路径
//             // 如下将生产：backgound:url(../images/sprite20324232.png)
//             'pathToSpriteSheetFromCSS': '../../images/sprite'+timestamp+'.png'
//         }))
// })

// 压缩图片
gulp.task('image', function() {
  return gulp.src('src/**')
    // .pipe(imagemin())
    .pipe(gulp.dest('./dist'));
});

// 压缩html
gulp.task('html', function() {
  return gulp.src('src/*.html')
    // .pipe(htmlmin({
    //   removeComments: true,
    //   collapseWhitespace: true,
    //   minifyJS: true
    // }))
    .pipe(gulp.dest('./dist'));
});

//处理es6
gulp.task('convertjs', function() {
  return gulp.src('./src/**/*.es6')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('src'))
})

//构建require
gulp.task('rjs', function() {
  return gulp.src(['src/**/*.js'])
    .pipe(amdOptimize("src/js/requireConfig"))
    .pipe(concat("app.js")) //合并  
    // .pipe(gulp.dest("dist/"))          //输出保存  
    // .pipe(rename("index.min.js"))          //重命名  
    // .pipe(uglify())                        //压缩  
    .pipe(gulp.dest("dist/js")); //输出保存  
});

// 生成hash文件名
gulp.task('rev', function() {
  // 其中加!前缀的是表示过滤该文件
  return gulp.src(['./dist/**/*', '!**/*.html', '!**/*.less', '!**/*.es6'])
    /* 转换成新的文件名 */
    .pipe(rev())
    .pipe(gulp.dest('./dist'))
    /*收集原文件名与新文件名的关系*/
    .pipe(rev.manifest())
    // 将文件以json的形式存在当前项目下的 ./rev 目录下
    .pipe(gulp.dest('./rev'));
});

// 替换文件路径
/* 使用这个模块，需要依赖rev任务，所以需要注入rev任务，如果不注入需要先执行rev任务 */
//从manifest文件中收集数据并且替换html模板中的链接
gulp.task('revCollector', function() {
  // 根据生成的json文件，去替换html里的路径
  return gulp.src(['./rev/*.json', './dist/*.html'])
    .pipe(revCollector({
      replaceReved: true, //说明模板中已经被替换的文件是否还能再被替换,默认是false
      dirReplacements: {
        '/src': ''
      }
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('clean', function() {
  del(['./rev/**','./dist/**']);
})

gulp.task('build', function(callback) {
  runsequence('clean',
    ['css','less','html','convertjs','image'],
    'script',
    'rjs',
    'rev',
    'revCollector',
    callback
    )
});
/*生产构建 end*/

/*开发构建 begin*/

//当src目录下文件发生改变的时候自动更新并刷新页面
gulp.task('devsrc', function() {
  return gulp.src(['./src/**', '!/src/**/*.less'])
    .pipe(connect.reload());
});

//开发过程中对less文件进行编译
gulp.task('devless', function() {
  return gulp.src('./src/**/*.less')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(less())
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'Firefox >= 20'],
      cascade: true, //是否美化属性值 默认：true 像这样：
      //-webkit-transform: rotate(45deg);
      //        transform: rotate(45deg);
      remove: true //是否去掉不必要的前缀 默认：true )
    }))
    .pipe(gulp.dest("src"))
    .pipe(connect.reload());
});

//开发过程中对es6进行转换
gulp.task('devconvertjs', function() {
  return gulp.src('./src/**/*.es6')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('src'))
    .pipe(connect.reload());
})

//构建require
gulp.task('devrjs', function() {
  return gulp.src(['src/**/*.js'])
    .pipe(amdOptimize("src/js/requireConfig"))
    .pipe(concat("app.js")) //合并  
    // .pipe(gulp.dest("dist/"))          //输出保存  
    // .pipe(rename("index.min.js"))          //重命名  
    // .pipe(uglify())                        //压缩  
    .pipe(gulp.dest("src/js")); //输出保存  
});


//启动gulp服务器
gulp.task('webserver', function() {
  connect.server({
    root: './',
    livereload: true,
    port: 8080
  });
});

//监听文件变化
gulp.task('watch', function() {
  gulp.watch(['./src/**/*.less'], ['devless']);
  gulp.watch(['./src/**/*.es6'], ['devconvertjs']);
  gulp.watch(['./src/**'], ['devsrc']);
});

gulp.task('release', function(callback) {
    runsequence(['devconvertjs', 'devless'], //编译es6 less
      'devrjs', //构建require
      'webserver', //启动服务器
      'watch', //监听文件变化
      callback
    )
  })
  /*开发构建 end*/