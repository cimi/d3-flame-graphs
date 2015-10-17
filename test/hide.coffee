require('coffee-script/register');
path    = require('path')
exec    = require('child_process').exec
d3      = require('d3')
chai    = require('chai')
expect  = chai.expect
chai.use(require('chai-things'))

describe 'd3.flameGraph.hide', ->
  describe 'when hiding nodes', ->
    it 'should subtract value from all parents', ->

    it 'should make the value of all children 0', ->

    it 'should preserve the original value of parents', ->

    it 'should preserve the original value of children', ->

    it 'should store the hidden value in a list', ->

  describe 'when unhiding nodes', ->
