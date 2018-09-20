import webpack from 'webpack';
import Path from 'path';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';

const ExtractTextPlugin = require("extract-text-webpack-plugin");

const noop = () => null;

const PATH = {
    ROOT: __dirname,
    SOURCE: Path.join(__dirname, './src'),
    TARGET: Path.join(__dirname, './dist')
};

const ENV = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production'
};


const NODE_ENV = process.env.NODE_ENV || ENV.DEVELOPMENT;
const isProd = NODE_ENV === ENV.PRODUCTION;
const isBuild = process.env.BUILD === 'true';

const extractScss = new ExtractTextPlugin({
    filename: "../css/[name].css",
    disable: isBuild
});

function getJSLoader() {
    return {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules\/(?!(obs-store|etherscan-api))/,
        options: {
            presets: ['react', 'es2017', 'es2016', 'stage-0'],
            plugins: ['transform-decorators-legacy', 'transform-class-properties']
        }
    };
}

function getTSLoader() {
    return {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader',
        options: {
            // silent: true,
            configFile: Path.resolve(__dirname, 'tsconfig.json'),
            plugins: ['transform-decorators-legacy', 'transform-class-properties']
        }
    };
}

function getSvgLoader() {
    return {
        test: /\.svg$/,
        use: [
            'react-svg-loader',
            {
                loader: 'svgo-loader',
                options: {
                    floatPrecision: 3,
                    plugins: [
                        {
                            removeViewBox: false,
                            removeEmptyAttrs: true,
                        },
                    ],
                },
            },
        ]
    };
}

function getScssLoader() {
    return {
        test: /\.scss$/,
        use: extractScss.extract({
            use: [{
                loader: "css-loader"
            }, {
                loader: "sass-loader",
                options: {
                    data: `@import "common.scss";`,
                    includePaths: [
                        Path.resolve(__dirname, './src/style')
                    ]
                }
            }],
            // use style-loader in development
            fallback: "style-loader"
        })
    };
}

function getMDLoader() {
    return {
        test: /\.md$/,
        use: ['raw-loader', {loader: 'markdown-loader'}],
    };
}

const Plugins = [
    new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(NODE_ENV)
    }),
    new webpack.EnvironmentPlugin({
        NODE_ENV: NODE_ENV
    }),
    isProd ? new webpack.optimize.ModuleConcatenationPlugin() : noop,

    isProd ? new webpack.LoaderOptionsPlugin({
        minimize: false,
        debug: false
    }) : noop,

    extractScss
];

const OptimisationProps = {
    minimizer: isProd ? [
        new UglifyJsPlugin({
            cache: true,
            parallel: true,
            uglifyOptions: {
                compress: true,
                ecma: 6,
                mangle: false
            },
            sourceMap: true
        })
    ] : undefined
};

const WebpackConfig = {

    devtool: isProd ? false : 'source-map',

    context: PATH.SOURCE,

    node: {fs: 'empty'},

    entry: {
        popup: ['babel-polyfill', 'popup'],
        pageContent: ['babel-polyfill', 'page-content'],
        background: ['babel-polyfill', 'background']
    },

    output: {
        filename: '[name].js',
        chunkFilename: '[name].js',
        path: Path.resolve(__dirname, './dist/chrome/js'),
        publicPath: '/js'
    },

    resolve: {
        extensions: ['.md', '.svg', '.ts', '.tsx', '.js', '.jsx', '.json'],
        modules: [
            PATH.SOURCE,
            Path.resolve(__dirname, './node_modules')
        ],
        alias: {
            Core: Path.join(__dirname, 'src/Core'),
            Popup: Path.join(__dirname, 'src/Popup'),
            Background: Path.join(__dirname, 'src/Background'),

            'be-shapy': Path.join(__dirname, 'src/be-shapy'),

            style: Path.join(__dirname, 'src/style'),
            svg: Path.join(__dirname, 'src/svg'),
            resources: Path.resolve(process.cwd(), 'resources'),
        }
    },

    plugins: Plugins,

    module: {
        rules: [
            getJSLoader(),
            getTSLoader(),
            getMDLoader(),
            getSvgLoader(),
            getScssLoader()
        ]
    },

    devServer: {
        compress: true,
        historyApiFallback: true,
        stats: {
            children: false,
            chunks: false,
        },
        overlay: {
            warnings: true,
            errors: true
        }
    },

    stats: {
        assets: !isProd,
        children: false,
        chunks: false
    },

    optimization: OptimisationProps,
    mode: isProd ? 'production' : 'development'
};

export default WebpackConfig;
