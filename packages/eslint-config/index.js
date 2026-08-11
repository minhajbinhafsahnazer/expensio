module.exports = {
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'controller', pattern: 'src/api/controllers/*' },
      { type: 'service', pattern: 'src/services/*' },
      { type: 'repository', pattern: 'src/database/repositories/*' },
      { type: 'database', pattern: 'src/database/schema/*' }
    ],
  },
  rules: {
    'boundaries/element-types': [
      2,
      {
        default: 'disallow',
        message: '${file.type} is not allowed to import ${dependency.type}',
        rules: [
          {
            from: ['controller'],
            allow: ['service', 'shared'],
          },
          {
            from: ['service'],
            allow: ['repository', 'shared'],
          },
          {
            from: ['repository'],
            allow: ['database', 'shared'],
          }
          // Repositories cannot import Services, Services cannot import Controllers
        ],
      },
    ],
  },
};
