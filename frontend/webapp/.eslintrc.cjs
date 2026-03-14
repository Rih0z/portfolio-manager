module.exports = {
  plugins: ['jsx-a11y'],
  extends: ['plugin:jsx-a11y/recommended'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'warn',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
  },
};
