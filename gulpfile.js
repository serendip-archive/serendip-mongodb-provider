var gulp = require("gulp");
var ts = require("gulp-typescript");
var fs = require("fs-extra");
var mocha = require("gulp-mocha");

var paths = {
  dist: "dist",
  tsSources: "src/**/*.ts",
  tests: "test/*.js"
};

gulp.task("test", ["ts"], function() {
  return gulp.src([paths.tests], { read: false }).pipe(
    mocha({
      reporter: "spec"
    })
  );
});

// compile typescripts
gulp.task("ts", function() {
  if (fs.existsSync(paths.dist)) {
    fs.emptyDirSync(paths.dist);
  }

  return gulp
    .src(paths.tsSources)
    .pipe(
      ts({
        noImplicitAny: false,
        target: "ES2015",
        sourceMap: true,
        module: "CommonJS",
        baseUrl: ".",
        paths: {
          "*": ["node_modules/*", "src/types/*"]
        }
      })
    )
    .pipe(gulp.dest(paths.dist));
});

gulp.watch(paths.tsSources, ["ts"]);

gulp.task("default", ["ts"], function() {
  return Promise.resolve();
});
