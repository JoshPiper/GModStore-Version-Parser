const core = require("@actions/core")
const github = require("@actions/github")
const semver = require("semver")

function inpOrFail(input, def = null){
	let variable = core.getInput(input)
	if (!variable){
		if (def !== null){
			return def
		} else {
			throw new Error(`Failed to get input ${input}`)
		}
	}
	return variable
}

let version
try {
	version = String(inpOrFail("version", github.context.ref))
} catch (err){
	core.setFailed(`An error occured during input processing.\n${err}`)
	return
}

try {
	let exp = version.split("/")
	let leng = exp.length
	let refs, type, name
	switch (leng){
		case 0:
			throw new Error("Post-splitting array had no length!")
		case 1:
			type = "explicit"
			name = exp[0]
			break;
		case 2:
			type = "explicit"
			name = exp.join("/")
			break;
		default:
			[refs, type, ...name] = exp
			if (refs === "refs"){
				// We're using a branch / tag input.
				name = name.join("/")
			} else {
				name = name.unshift(refs, type).join("/")
				type = "explicit"
			}
	}

	core.info(`Parsed version ${version} to ${type} (${name})`)
	if (type === "explicit" || type === "tags"){
		core.info("Version is explicit or tag based.")
		core.setOutput("branch", false)
		core.setOutput("tag", type === "tag")

		core.setOutput("rawversion", name)
		core.info("Attempting to parse name as SemVer")

		let semversion = semver.parse(name)
		if (!semversion){
			core.setFailed("Failed to parse as SemVer.")
			return
		}

		core.info("Setting deployment type.")
		// Public Demo, All Owners Stable, Restricted Beta Alpha and Private.
		// 1.0.0-stable-private should work out to private.
		let acceptableTypes = ["demo", "stable", "beta", "alpha", "private"]
		let releaseType = "stable"

		for (let pr of semversion.prerelease){
			let next = acceptableTypes.indexOf(pr)
			if (next !== -1){
				let cur = acceptableTypes.indexOf(releaseType)
				if (next > cur){
					releaseType = pr
				}
			}
		}
		core.info(`Deployment type set to ${releaseType}`)
		core.setOutput("deploy", releaseType)

		semversion.build = []
		semversion.prerelease = []
		semversion.format()
		let clean = semversion.toString()
		core.info(`Cleaned version name: ${clean}`)
		core.setOutput("version", clean)
	} else if (type === "heads"){
		core.info("Input parsed as branch.")
		core.setOutput("branch", true)
		core.setOutput("tag", false)
		core.setOutput("rawversion", name)
		core.setOutput("version", name)
		core.setOutput("deploy", false)
	} else {
		core.setFailed("An unknown type was found by the parser.")
		return
	}
} catch (error){
	core.setFailed(error.message)
}
