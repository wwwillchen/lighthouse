# A/B Screenshot Comparison

This tools enables you to look at how two different versions of perf metrics measure real world sites.

### Generating & viewing charts

```
# 1. Run measure two times (e.g two different versions of lighthouse)
# in /plots/
$ node measure.js

# save the first results into another directory
$ mv ./out ./out-first

# (e.g. switch versions of lighthouse, modify algorithm)
$ node measure.js

# Analyze the screenshot data to generate a summary file
# in /plots/ab-screenshot
$ node analyze.js -a ../out-first -b ../out-second

# Use the screenshot viewer
# Open index.html in browser
```
