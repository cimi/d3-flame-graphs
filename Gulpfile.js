var gulp = require('gulp');
var babel = require('gulp-babel');
var coffee = require('gulp-coffee');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var del = require('del');

var paths = {
  scripts: ['src/**/*.coffee'],
  scriptsEs6: ['src/**/*.js'],
  styles: ['src/**/*.scss'],
  demoResources: ['demo/**/*.*', 'dist/**/*.*', '!demo/src/**'],
  demoScripts: ['demo/src/**/*.coffee'],
  dist: 'dist',
  demoOut: 'build'
};

gulp.task('clean', function(cb) {
  del([paths.dist, paths.demoOut], cb);
});

// Create the distributable artifacts of the plugin.
gulp.task('dist:main', function() {
  return gulp.src(paths.scriptsEs6)
    .pipe(babel({ presets: ['env'] }))
    .pipe(concat('d3-flame-graph.js'))
    .pipe(gulp.dest(paths.dist))
});
gulp.task('dist:min', function() {
  return gulp.src(paths.scriptsEs6)
    .pipe(babel({ presets: ['env'] }))
    .pipe(uglify())
    .pipe(concat('d3-flame-graph.min.js'))
    .pipe(gulp.dest(paths.dist));
});
gulp.task('dist:styles', function() {
  return gulp.src(paths.styles)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(paths.dist))
});

gulp.task('dist', ['dist:min', 'dist:main', 'dist:styles']);

// building the demo page
gulp.task('demo-scripts', ['dist'], function() {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(paths.demoScripts)
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(concat('demo.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.demoOut));
});

gulp.task('demo-copy', ['demo-scripts'], function() {
  return gulp.src(paths.demoResources)
    .pipe(gulp.dest(paths.demoOut));
});

// Rerun the task when a file changes
gulp.task('demo-watch', ['demo-copy'], function() {
  gulp.watch(paths.scripts, ['demo-copy']);
  gulp.watch(paths.styles, ['demo-copy']);
  gulp.watch(paths.demoResources, ['demo-copy']);
  gulp.watch(paths.demoScripts, ['demo-copy']);
});

gulp.task('serve', ['demo-watch'], function() {
  browserSync({ server: { baseDir: paths.demoOut } });
  gulp.watch(['*.html', '*.css', '*.js'], { cwd: paths.demoOut }, reload);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['serve']);
