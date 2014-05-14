module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    tag: {
      banner: '/*  <%= pkg.name %>\n' +
        ' *  @version <%= pkg.version %>\n' +
        ' *  @author <%= pkg.author %>\n' +
        ' *  Project: <%= pkg.homepage %>\n' +
        ' *  Copyright <%= pkg.year %>. <%= pkg.license %> licensed.\n' +
        ' */\n'
    },
    copy: {
      build: {
        cwd: 'viewer',
        src: ['**'],
        dest: 'dist',
        expand: true
      }
    },
    clean: {
      build: {
        src: ['dist']
      }
    },
    autoprefixer: {
      build: {
        expand: true,
        cwd: 'dist',
        src: ['**/*.css', '!**/dbootstrap/**'],
        dest: 'dist'
      }
    },
    cssmin: {
      build: {
        expand: true,
        cwd: 'dist',
        src: ['**/*.css'],
        dest: 'dist'
      }
    },
    jshint: {
      build: {
        src: ['viewer/**/*.js', '!**/dbootstrap/**', '!**/TOC.js'],
        options: {
          jshintrc: '.jshintrc',
          reporter: require('jshint-stylish')
        }
      }
    },
    uglify: {
      build: {
        files: [{
          expand: true,
          cwd: 'viewer',
          src: ['**/*.js'],
          dest: 'dist',
          ext: '.js'
        }],
        options: {
          banner: '<%= tag.banner %>'
        }
      }
    },
    watch: {
      dev: {
        files: ['viewer/**'],
        tasks: ['jshint']
      }
    },
    connect: {
      server: {
        options: {
          port: 3000,
          base: 'dist',
          hostname: '*'
        }
      }
    }
  });

  // load the tasks
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-newer');

  // define the tasks
  grunt.registerTask('default', 'Watches the project for changes, automatically builds them and runs a server.', ['build']);
  grunt.registerTask('build', 'Compiles all of the assets and copies the files to the build directory.', ['clean', 'copy', 'stylesheets', 'scripts']);
  grunt.registerTask('scripts', 'Compiles the JavaScript files.', ['jshint', 'uglify']);
  grunt.registerTask('stylesheets', 'Compiles the stylesheets.', ['autoprefixer', 'cssmin']);
};