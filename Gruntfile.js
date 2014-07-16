module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['build'],
    uglify: {
      options: {
        banner: '/*\n<%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> <%= gitcommit %>\n\nVisit https://greglu.github.io/vss for license and more information\n*/\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'src/**/*.js']
    },
    cssmin: {
      minify: {
        expand: true,
        cwd: 'src/',
        src: ['*.css', '!*.min.css'],
        dest: 'build/',
        ext: '.min.css'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('gitcommit', 'Get the current git commit', function (prop) {
    var done = this.async();
    grunt.util.spawn({
      cmd : 'git',
      args : [ 'rev-parse', 'HEAD' ]
    }, function (err, result) {
      if (err) {
        grunt.log.error(err);
        return done(false);
      }
      grunt.config.set('gitcommit', result.stdout);
      done(result);
    });
  });

  // Default task
  grunt.registerTask('default', ['gitcommit', 'clean', 'jshint', 'uglify', 'cssmin']);

};
