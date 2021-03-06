var spawn = require("child_process").spawn;
var fs = require("fs");
var Path = require("path");
var async = require("async");
var rimraf = require("rimraf");
var mkdirp = require('mkdirp');
var wc;

module.exports = {	
	init: function(url, locallocation, callback) {
		rimraf(locallocation, function() {
			wc = Path.resolve(locallocation);

			mkdirp(locallocation, function(err) {

				if (err) {
					callback(err); return;
				}

				var child = spawn("svn", [
					//Command-line arguments, in order
					"checkout",
					url,
					locallocation,
					"--no-auth-cache",
					"--non-interactive",
					"--trust-server-cert"
					] );

				err = null;

				child.stdout.on("data", function (data) {
					//console.log(data.toString("utf-8"));
				});

				child.stderr.on("data", function (data) {
					err = new Error(data.toString("utf-8"));
				});

				child.on("close", function (code) {
					callback(err);
				});

			});

		})
	},
	
	getOwner: function(file, callback) {
		var fileAuthors = {};
		var err = null;
		var linepatt = /^\s*(\d+)\s+(\w+)/i;
		var child = spawn("svn", [
			//Command-line arguments, in order
			"blame",
			file,
			"-x -b", //Ignore whitespace-only changes
			"--force" //Scan even binary files
			],
			{
				cwd: wc
			} );

		child.stdout.on("data", function (data) {
			var lines = data.toString("utf-8").split("\n");
			
			async.each(lines,function(line, cb) {
				var match = linepatt.exec(line);
				if (!match) {
					return;
				}
				var author = match[2].trim();
				if (!fileAuthors[author]) {
					fileAuthors[author] = 0;
				};
				fileAuthors[author]++;
			});
		});

		child.stderr.on("data", function (data) {
			err = new Error(data.toString("utf-8"));
		});

		child.on("close", function (code) {
			if(err) {
				callback(err); return;
			}
							
			var max = 0;
			var winner = "";
			for(var auth in fileAuthors) {
				if (fileAuthors[auth] > max) {
					max = fileAuthors[auth];
					winner = auth;
				}
			}
			
			callback(err, winner);
		});
	}
	
	
}