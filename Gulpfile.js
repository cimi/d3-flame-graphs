var gulp = require('gulp');
var coffee = require('gulp-coffee');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var del = require('del');

var paths = {
  scripts: ['src/**/*.coffee', '!client/external/**/*.coffee'],
  app: ['app/*']
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function(cb) {
  // You can use multiple globbing patterns as you would with `gulp.src`
  del(['build'], cb);
});

gulp.task('scripts', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(paths.scripts)
    .pipe(sourcemaps.init())
      .pipe(coffee())
      // .pipe(uglify())
      .pipe(concat('all.min.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build'));
});

gulp.task('copy', ['scripts'], function(){
  return gulp.src('app/**/*.*')
    .pipe(gulp.dest('build'));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.app, ['copy']);
});

gulp.task('serve', ['watch', 'copy'], function() {
  browserSync({
    server: {
      baseDir: 'build'
    }
  });

  gulp.watch(['*.html', '*.css', '*.js'], {cwd: 'build'}, reload);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch', 'scripts', 'copy']);