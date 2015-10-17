require('coffee-script/register');
path    = require('path')
exec    = require('child_process').exec
d3      = require('d3')
chai    = require('chai')
expect  = chai.expect
chai.use(require('chai-things'))

# the flame graph plugin does not have an exporter
# as it augments the existing d3 object
require('../src/d3-flame-graph')

describe 'd3.flameGraph.augment', ->
  root = undefined
  describe 'when provided with a simple tree', ->
    beforeEach (done) ->
      data = { value: 45, name:"root", children: [] }
      data.children.push({name: "c1", value: 10}, {name: "c2", value: 20})
      root = d3.flameGraphUtils.augment(data)
      done()

    it 'should mark the root as augmented', ->
      expect(root.augmented).to.be.true

    it 'should mark all the children as augmented', ->
      expect(root.children).to.all.have.property('augmented', true)

    it 'augments them with filler nodes', ->
      expect(root.children).to.have.length(3)
      filler = root.children[2]
      expect(filler).has.property('filler', true)
      expect(filler).has.property('value', 15)

    it 'augments them with their level', ->
      expect(root).has.property('level', 1)
      expect(root.children).to.all.have.property('level', 0)

    it 'saves the original value in a separate field', ->
      expect(root).has.property('originalValue', 45)
      expect(root.children).to.all.have.property('originalValue')

  describe 'when provided with a multilevel tree', ->
    beforeEach (done) ->
      data = { value: 45, name:"root", children: [] }
      firstChild = {name: "c11", value: 10, children: [{name: "c21", value: 1}]}
      secondChild = {name: "c12", value: 20}
      data.children.push(firstChild, secondChild)
      root = d3.flameGraphUtils.augment(data)
      done()

    it 'augments the root with the correct level', ->
      expect(root).has.property('level', 2)

    it 'augments the children with the correct level', ->
      expect(root.children).to.include.an.item.that.has.property('level', 1)
      expect(root.children).to.include.an.item.that.has.property('level', 0)

    it 'augments the grandchildren with the correct level', ->
      grandchildren = root.children[0].children
      expect(grandchildren).to.all.have.property('level', 0)

