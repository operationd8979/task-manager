module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // FR-058a: every display string comes from src/lib/strings.ts. Without a
      // rule that fails the build, "no hardcoded strings" is only a promise.
      files: ['src/features/**/*.tsx', 'src/components/**/*.tsx'],
      rules: {
        // ignoreProps stays true on purpose: FR-058a is about DISPLAY strings.
        // Props like accessibilityRole="button" are API values, not text the
        // user reads, and flagging them would train people to disable the rule.
        'react/jsx-no-literals': [
          'error',
          {noStrings: true, allowedStrings: [], ignoreProps: true},
        ],
      },
    },
  ],
};
