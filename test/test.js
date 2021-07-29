const assert = require("assert")
const proc = require("child_process")
const util = require("util")
const path = require("path")

const goodBranches = [
	{arg: "refs/heads/master", exp: {
		branch: 'true',
		tag: 'false',
		rawversion: 'master',
		version: 'master',
		deploy: 'false'
	}},
	{arg: "refs/heads/main", exp: {
		branch: 'true',
		tag: 'false',
		rawversion: 'main',
		version: 'main',
		deploy: 'false'
	}},
	{arg: "refs/heads/feat/some-feature", exp: {
		branch: 'true',
		tag: 'false',
		rawversion: 'feat/some-feature',
		version: 'feat/some-feature',
		deploy: 'false'
	}}
]

const goodTags = [
	{arg: "refs/tags/v1.0.0", exp: {
		branch: 'false',
		tag: 'true',
		rawversion: 'v1.0.0',
		version: '1.0.0',
		deploy: 'stable'
	}},
	{arg: "refs/tags/3.2.1", exp: {
		branch: 'false',
		tag: 'true',
		rawversion: '3.2.1',
		version: '3.2.1',
		deploy: 'stable'
	}},
	{arg: "refs/tags/1.0.0-beta", exp: {
		branch: 'false',
		tag: 'true',
		rawversion: '1.0.0-beta',
		version: '1.0.0',
		deploy: 'beta'
	}}
]

const goodExplicit = [
	{
		arg: "v1.2.3",
		exp: {
			branch: 'false',
			tag: 'false',
			deploy: 'stable',
			rawversion: 'v1.2.3',
			version: '1.2.3'
		}
	},
	{
		arg: "v1.2.3-alpha",
		exp: {
			branch: 'false',
			tag: 'false',
			deploy: 'alpha',
			rawversion: 'v1.2.3-alpha',
			version: '1.2.3'
		}
	},
	{
		arg: "0.0.0+buildInformation1.23.5",
		exp: {
			branch: 'false',
			tag: 'false',
			deploy: 'stable',
			rawversion: '0.0.0+buildInformation1.23.5',
			version: '0.0.0'
		}
	}
]

const node = "node"
const script = path.join(__dirname, '..', 'index.js')

async function getCommandsFromRun(environment){
	environment.PATH = process.env.PATH

	let sub_proc = await proc.spawn(node, [script], {
		env: environment,
		encoding: "utf8"
	})

	let output = await (new Promise((resolve, reject) => {
		let stdout = []
		let stderr = []

		sub_proc.stdout.on("data", function(buffer){
			stdout.push(buffer.toString("utf8"))
		})
		sub_proc.stderr.on("data", function(buffer){
			stderr.push(buffer.toString("utf8"))
		})

		sub_proc.on("close", function(status){
			resolve({
				status,
				stdout: stdout.join(),
				stderr: stderr.join()
			})
		})
	}))

	let commands = {}
	let outputs = output.stdout.matchAll(/::([\w-]*)(.*)[\n\r]{1,2}/g)
	for (let output of outputs){
		let command = output[1].trim()
		let args = output[2].trim()
		commands[command] = commands[command] ?? []
		commands[command].push(args)
	}

	if (commands['set-output'] !== undefined){
		let outputs = {}
		for (let command of commands['set-output']){
			let match = command.match(/name=(?<name>\w+)::(?<value>.*)$/)
			if (match !== null){
				outputs[match.groups.name] = match.groups.value
			}
		}
		commands['set-output'] = outputs
	}

	if (commands.error !== undefined){
		// noinspection LoopStatementThatDoesntLoopJS
		for (let error of commands.error){
			assert.fail(error.substr(2))
		}
	}

	if (commands.warn !== undefined){
		// noinspection JSUnfilteredForInLoop
		for (let idx in commands.warn){
			let warning = commands.warn[idx]
			commands.warn[idx] = warning.substr(2)
		}
	}

	if (output.status !== 0){
		assert.fail(`Node exited with a non-zero exit code.\nerror messages: ${output.stdout}`)
	}

	return [commands, output.stdout]
}

async function getOutputsFromRun(...args){
	let [commands, stdout] = await getCommandsFromRun(...args)
	console.log(args, commands, stdout)
	return commands['set-output'] ?? {}
}

describe('Action', function(){
	describe('correctly handles well-formed branches', function(){
		goodBranches.forEach(({arg, exp}) => {
			it(`handles ${arg}`, async function(){
				let outputs = await getOutputsFromRun({
					INPUT_VERSION: arg
				})

				assert.deepEqual(outputs, exp)
			})
		})
	})

	describe('correctly handles well-formed tags', function(){
		goodTags.forEach(({arg, exp}) => {
			it(`handles ${arg}`, async function(){
				let outputs = await getOutputsFromRun({
					INPUT_VERSION: arg
				})

				assert.deepEqual(outputs, exp)
			})
		})
	})

	describe('correctly handles well-formed explicit names', function(){
		goodExplicit.forEach(({arg, exp}) => {
			it(`handles ${arg}`, async function(){
				let outputs = await getOutputsFromRun({
					INPUT_VERSION: arg
				})

				assert.deepEqual(outputs, exp)
			})
		})
	})
})
