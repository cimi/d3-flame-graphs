var gulp = require('gulp');
var coffee = require('gulp-coffee');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var del = require('del');

var paths = {
  scripts: ['src/d3-flame-graph.coffee'],
  demoScripts: ['src/**/*.coffee'],
  dist: 'dist',
  demoOut: 'build'
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function(cb) {
  // You can use multiple globbing patterns as you would with `gulp.src`
  del(['build', 'dist'], cb);
});

gulp.task('scripts', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(paths.demoScripts)
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(concat('all.min.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.demoOut));
});

// Create the distributable artifacts of the plugin.
gulp.task('dist', function () {
  gulp.src(paths.scripts)
    .pipe(coffee())
    .pipe(concat('d3-flame-graph.js'))
    .pipe(gulp.dest(paths.dist))
  gulp.src(paths.scripts)
    .pipe(coffee())
    .pipe(uglify())
    .pipe(concat('d3-flame-graph.min.js'))
    .pipe(gulp.dest(paths.dist))
});

gulp.task('copy', ['scripts'], function(){
  return gulp.src(['app/**/*.*'])
    .pipe(gulp.dest(paths.demoOut));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.app, ['copy']);
});

gulp.task('serve', ['watch', 'copy'], function() {
  browserSync({
    server: {
      baseDir: paths.demoOut
    }
  });

  gulp.watch(['*.html', '*.css', '*.js'], {cwd: paths.demoOut}, reload);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch', 'scripts', 'copy']);