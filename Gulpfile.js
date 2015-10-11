var gulp = require('gulp');
var coffee = require('gulp-coffee');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var del = require('del');

var paths = {
  scripts:        ['src/**/*.coffee'],
  styles:         ['src/**/*.css'],
  demoResources:  ['demo/**/*.*', 'dist/**/*.*', '!demo/src/**'],
  demoScripts:    ['demo/src/**/*.coffee'],
  dist:           'dist',
  demoOut:        'build'
};

gulp.task('clean', function(cb) {
  del([paths.dist, paths.demoOut], cb);
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
  gulp.src(paths.styles)
    .pipe(gulp.dest(paths.dist))
});
// TODO: release task that creates a tag from the distributables
// and publishes to npm


// building the demo page
gulp.task('demo-scripts', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(paths.demoScripts)
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(concat('demo.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.demoOut));
});

gulp.task('demo-copy', ['dist', 'demo-scripts'], function(){
  return gulp.src(paths.demoResources)
    .pipe(gulp.dest(paths.demoOut));
});

// Rerun the task when a file changes
gulp.task('demo-watch', function() {
  gulp.watch(paths.scripts,         ['dist']);
  gulp.watch(paths.demoScripts,     ['demo-scripts']);
  gulp.watch(paths.demoResources,   ['demo-copy']);
});

gulp.task('serve', ['demo-watch', 'demo-copy'], function() {
  browserSync({ server: { baseDir: paths.demoOut } });
  gulp.watch(['*.html', '*.css', '*.js'], { cwd: paths.demoOut }, reload);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['demo-watch', 'demo-scripts', 'demo-copy']);