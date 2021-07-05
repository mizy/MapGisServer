return {
    mode: 'development',
	cache: true,
	output: {
		chunkFilename: 'chunks/[name].js',
		publicPath: '/'
	},
    devtool: 'eval-cheap-module-source-map',
    devServer: {
        port: 7080,
        index: 'index.html',
        open: true,
        host: '0.0.0.0',
        openPage: './oasis',
        contentBase: [path.join(__dirname, './public')],
        hot: true,
        historyApiFallback: true,
        proxy: [
            {
                context: '/oasisApi/job/ws/spark',
                target: 'http://10.57.34.8:9090',
                ws: true,
                changeOrigin: true,
                pathRewrite: {
                }
            }
        ]
    },
    stats: 'minimal',
    performance: {
        hints: 'warning'
    },
    optimization: {
        runtimeChunk: 'single',
    },
    module: {
        rules: [
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: ['file-loader']
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: [ 'babel-loader']
            },
            {
                test: /(\.less|\.css)$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'less-loader'}
                ]
            }
        ]
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
	optimization: {
		minimize: false
	}
}