#!/usr/bin/env node

/**
 * Athor: Ben Henderson - benhenderson976@gmail.com
 * script to replace script names in files with filenames
 * manifest created from webpack,
 **/

'use strict'

let manifestPath = ''
let stringToReplace = ''
let r = ''
let reg = null
let filePaths = ''

if (process.argv.indexOf('-m') !== -1) {
  manifestPath = process.argv[process.argv.indexOf('-m') + 1]
  manifestPath = './' + manifestPath + '/manifest.json'
}
if (process.argv.indexOf('-r') !== -1) {
  stringToReplace = process.argv[process.argv.indexOf('-r') + 1]

  stringToReplace = '<script src='
  r = stringToReplace + '["\'](.+?)["\']'
  reg = new RegExp(r, 'g')
}
if (process.argv.indexOf('-e') !== -1) {
  filePaths = process.argv[process.argv.indexOf('-e') + 1]
}

const fs = require('fs')
const manifest = require(manifestPath)
const path = require('path')
const replace = require('replace-in-file')
var gitignore = require('glob-fs-gitignore')
var glob = require('glob-fs')({ gitignore: true })
const readline = require('readline')
const gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(fs)
let files = []
let results = []
const colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  fg: {
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m'
  },
  bg: {
    Cyan: '\x1b[46m',
    Blue: '\x1b[44m'
  }
}
const cross = '❌'
const tick = '✔'

let manifestObject = {}

/**
 * For each object in the manifest remove the
 * .js and push into new object
 **/
Object.keys(manifest).forEach(function(key) {
  let a = key
    .split(path.extname(key))
    .reduce((acc, val) => acc.concat(val), [])
    .filter(Boolean)

  manifestObject[a[0]] = manifest[key]
})

/**
 * FUNCTION keyValuePair
 *@PARAM {array} replacements, array of strings to be replace
 *
 *@DESCRIPTION a function to replace the input string with the
 * output string
 *
 *@RETURN {array} returns a new array with the replaced strings
 **/

function keyValuePair(replacements) {
  return (replacements = replacements.map(
    a => `${stringToReplace}"${manifestObject[a]}"`
  ))
}

/**
 * @DESCRIPTION get the globbed files and pass them to
 * @reference openFile
 *@RETURN {array} returns a new array with the replaced strings
 **/

files = glob
  .use(gitignore())
  .readdirPromise(filePaths)
  .then(function(files) {
    console.log(
      colors.bg.Blue,
      colors.fg.Yellow,
      'modifications in:',
      colors.Reset
    )

    return openFile(files)
  })
  .catch(function(err) {
    return console.log(
      colors.Bright + colors.fg.Red,
      cross,
      'There was an error in finding your files',
      err
    )
  })

/**
 * FUNCTION openFile
 *@PARAM {array} filesArray, array of filenames
 *
 *@DESCRIPTION a function to loop through each file,
 * pass it to @reference modFile then use the returned
 * object to do the replacements with if fileOptions returns
 * it will replace it.
 **/
function openFile(filesArray) {
  filesArray.forEach(singlefile => {
    modFile(singlefile)
      .then(function(fileOptions) {
        if (fileOptions === 'no match') {
          return null
        }
        replace(fileOptions)
          .then(changes => {
            if (changes && changes.length) {
              console.log(
                colors.Bright + colors.fg.Green,
                tick,
                colors.Reset,
                changes.join('')
              )
            }
          })
          .catch(error => {
            console.log(
              colors.Bright + colors.fg.Red,
              cross,
              'There was an error trying to replace the files',
              error
            )
          })
      })
      .catch(function(err) {
        console.log(
          colors.Bright + colors.fg.Red,
          cross,
          'There was an error : ',
          err
        )
      })
  })
}

/**
 * FUNCTION modFile
 *@PARAM {single} Single file name
 *
 *@DESCRIPTION open each file using a stream to check if
 * the file contains the string to replace and if it does pass the fileOption
 * containing the filename, string to be replaced, string to replace
 *
 *@RETURNS promise with the fileoptions if successful otherwise returns
 * 'no match'
 **/

const modFile = single =>
  new Promise(resolve => {
    let stream = fs.createReadStream(single)
    stream.on('data', function(data) {
      let arr = []

      let matches = []
      let replacements = []

      let modules = data.toString().match(reg)

      matches.push(data.toString().match(reg))

      if (matches[0] == null) {
        return resolve('no match')
      }

      if (modules) {
        Object.keys(manifestObject).forEach(function(key) {
          modules.forEach(function(mod) {
            if (mod.includes(key)) {
              replacements.push(key)
            }
          })
        })
      }
      replacements = keyValuePair(replacements)
      let entryStrings = [].concat(...matches)

      let replaceStrings = [].concat(...replacements)

      let fileOptions = {
        files: single,
        from: entryStrings,
        to: replaceStrings
      }

      resolve(fileOptions)
    })
    stream.on('error', function(err) {})
  })
