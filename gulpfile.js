const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass-embedded'));
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const browserSync = require('browser-sync').create();
const { parallel, series } = require('gulp');

// Config object for paths
const paths = {
  scss: {
    src: 'styles/**/*.scss',
    entry: 'styles/main.scss',
    dest: 'assets/'
  },
  js: {
    src: 'assets/main.js',     // ← Directly target your source file
    dest: 'assets/'
  },
  html: './*.html'
};

// Sass compilation with error handling
function compileSass() {
  return gulp.src(paths.scss.entry)
    .pipe(sourcemaps.init())
    .pipe(sass({
      style: 'expanded',
      includePaths: ['node_modules'] // Add if using external dependencies
    }).on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.scss.dest))
    .pipe(browserSync.stream());
}

// Minify CSS and add .min suffix
function minifyCSS() {
  return gulp.src(`${paths.scss.dest}/main.css`)
    .pipe(cleanCSS({ compatibility: 'ie11' }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.scss.dest))
    .pipe(browserSync.stream());
}

// JavaScript processing
function processJS() {
  return gulp.src(paths.js.src)
    .pipe(sourcemaps.init())
    .pipe(terser())
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.js.dest))
    .pipe(browserSync.stream());
}

// BrowserSync server
function serve() {
  browserSync.init({
    server: {
      baseDir: './',
      index: 'index.html'
    },
    port: 3000,
    open: false
  });
}

// Watch files
function watchFiles() {
  gulp.watch(paths.scss.src, series(compileSass, minifyCSS));
  gulp.watch(paths.js.src, processJS);
  gulp.watch(paths.html).on('change', browserSync.reload);
}

// Export tasks
exports.sass = series(compileSass, minifyCSS);
exports.js = processJS;
exports.serve = serve;
exports.watch = watchFiles;
exports.default = parallel(
  series(compileSass, minifyCSS),
  processJS,
  parallel(serve, watchFiles)
);
