(function() {
/**
 * Подключение dust-хэлперов для node.js и browser использования
 */

    var helpers = {};

    function addHelpers (dust) {
        var helper;

        dust.helpers = dust.helpers || {};

        for (helper in helpers) {
            if (helpers.hasOwnProperty(helper)) {
                dust.helpers[helper] = helpers[helper];
            }
        }
    }

    /* HELPERS HERE */

    helpers.my = function (chunk, ctx, bodies, params) {
        var body = bodies.block,
            //content,
            moduleTypes = {
                table: {
                    node: 'table'
                },
                form: {
                    node: 'form'
                }
            },
            moduleType = dust.helpers.tap(params.module, chunk, ctx),
            moduleParams = moduleTypes[moduleType] || {},
            paramName,
            saveData;

        for (paramName in params) {
            if (params.hasOwnProperty(paramName)) {
                moduleParams[paramName] = dust.helpers.tap(params[paramName], chunk, ctx);
            }
        }

        moduleParams.node = moduleParams.node || 'div';

        function createModuleHtml (moduleParams, content) {
            var opt = '';
            content = content || '';

            opt = "data-options='" + JSON.stringify(moduleParams) + "'";

            return '<' + moduleParams.node + ' data-module="' + moduleParams.module + '" ' + opt + '>' + content + '</' + moduleParams.node + '>';
        }

        ctx = ctx.push(params);
        if (ctx.stack.tail && ctx.stack.tail.head) {
            ctx = ctx.push(ctx.stack.tail.head);
        }

        if (bodies.json) {
            saveData = chunk.data;
            chunk.data = [];
            moduleParams.json = dust.helpers.tap(bodies.json, chunk, ctx);
            moduleParams.json = JSON.parse(moduleParams.json);
            chunk.data = saveData;
        }

        if (body) {
            return chunk.write(createModuleHtml(moduleParams, dust.helpers.tap(body, chunk, ctx)));
        }

        return chunk.write(createModuleHtml(moduleParams));
    };

    helpers.partial = function (chunk, ctx, bodies, params) {
        var body = bodies.block,
            partial = dust.helpers.tap(params.name, chunk, ctx),
            partialChunk;

        if (body) {
            partialChunk = chunk.partial(partial, ctx.push(params), {
                content: dust.helpers.tap(body, chunk, ctx.push(params))
            });

            return chunk;
        } else {
            partialChunk = chunk.partial(partial, ctx);
        }

        //chunk.end();

        return chunk;
    };

    /* end helpers */

    /* global module */
    if (typeof(module) !== 'undefined') {
        module.exports = addHelpers;
    } else if (typeof(dust) !== 'undefined') {
        addHelpers(dust);
    } else {
        throw "Can't find Dust!";
    }
}());