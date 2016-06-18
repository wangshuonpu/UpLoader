/**
 * @file 移动端图片上传组件
 * @author Varsha 
 */

define(function (require) {
    var exports = {};

    var $input;
    var $container;
    var $form;

    var currIndex = 0; // 当前图片序号
    var url = '';

    var imgs = []; // 暂存上传成功图片的url
    // var imgsToUpload = []; // 要上传的图片列表

    var TPL_FORM = '<form enctype="multipart/form-data" method="post">'
        + '<input type="file" name="file" accept="image/*" data-role="file-input">'
        + '</form>';
    var TPL_OVERSIZE = '<span data-role="alert-oversize">图片过大</span>';
    var TPL_FAIL = '<span data-role="alert-fail">上传失败\n点击重试</span>';

    var ERR_IMG_NUM_BEYOND = 1;
    var PENDING = 1;
    var DONE = 2;
    var FAIL = 3;
    var OVERSIZE = 4;

    exports.options = {

        formContainer: '', // 上传表单容器，must

        container: '', // 图片容器, must

        action: '../mock/imgUp1.json', // 图片上传地址

        maxNum: 8, // 上传图片数量上限

        multiple: true, // 文件选择，是否可多选

        timeout: 10000, // 上传超时时间

        maxSize: 5, // 上传图片大小上限

        images: [], // 已上传图片列表，用于再编辑时显示已上传图片

        progressHtml: '', // 进度条html模板

        deleteHtml: 'x' // 删除按钮模板
    };

    exports._imgs = []; // 存储图片信息对象

    /**
     * 获取图片信息
     *
     * @param {number} index 图片序号
     * @param {Object|string} key 值对象|key
     * @param {*=} value 值
     */
    exports._setImgs = function (index, key, value) {

        if (key === null) {
            this._imgs[index] = null;
            return;
        }

        if (!this._imgs[index]) {
            this._imgs[index] = {};
        }

        if (typeof key === 'string') {
            this._imgs[index][key] = value;
            return;
        }

        $.extend(this._imgs[index], key);
    }

    exports._getImgs = function (index, key) {
        return this._imgs[index][key];
    }
    exports._onFileChange = function (e) {
        var images = e.target.files;
        var imgLen = images.length;

        if (imgLen <= 0) {
            return;
        }

        if (imgLen + currIndex >= this.options.maxNum) {
            this.errorHandler({type: ERR_IMG_NUM_BEYOND, message: '最多只能上传' + this.options.maxNum + '张图片'});
            return;
        }

        this._createImgBoxes(imgLen);

        this.imgsToUpload = images;
        this._uploadImages();
    };

    /**
     * 创建图片格子
     *
     * @param len 数量
     * @private
     */
    exports._createImgBoxes = function (len) {
        var html = '';
        var imgIndex = currIndex;
        for (var i = 0; i < len; i++) {
            html += '<div data-role="image-wrap" data-id="' + (imgIndex++) + '">'
                + '<div data-role="progress">' + this.options.progressHtml + '</div>'
                + '<div data-role="alert"></div>'
                + '<span data-role="delete" data-id="' + (imgIndex++) + '">' + this.options.deleteHtml + '</span>'
                + '</div>';
        }

        $container.append($(html));
    };

    exports._uploadImages = function () {
        var me = this;
        $.each(me.imgsToUpload, function (index, item) {
            me._postImg(currIndex++, item);
        });
    };

    exports._createXhr = function () {
        var me = this;
        var xhr = $.ajaxSettings.xhr();
        if (xhr.upload) {
            xhr.upload.addEventListener('progress', me.progressHandler, false);
            return xhr;
        }
    };

    /**
     * 上传图片
     *
     * @param {number} index 图片序号
     * @param {Object} img 图片
     * @private
     */
    exports._postImg = function (index, img) {

        var me = this;

        me._setImgs(index, {
            'file': img,
            'state': PENDING,
            'el': me._getImgWrapByIndex(index)
        });

        // 图片超过最大限制
        if (img.size > me.options.maxSize * 1024 * 1024) {
            me._overSize(index);

            me._setImgs(index, 'state', OVERSIZE);

            return;
        }

        var formData = new FormData(this.form);
        formData.append('file', img);

        // 添加自定义字段
        var params = this.params;
        if (params && params.length !== 0) {
            $.each(params, function (key, value) {
                formData.append(key, value);
            });
        }

        $.ajax({
            url: url,
            type: 'POST',
            xhr: me._createXhr,
            beforeSend: me.beforeSendHandler,
            success: me._completeHandler.bind(me, index, img),
            error: me._failHandler.bind(me, index, img),
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
    };

    exports.progressHandler = function (index) {
        console.log('progress', index);
    };

    exports.beforeSendHandler = function (index) {
        console.log('before send', index);
    };

    /**
     * 图片上传成功回调
     *
     * @param index
     * @param img
     * @param res
     * @param status
     * @param xhr
     * @private
     */
    exports._completeHandler = function (index, img, res, status, xhr) {
        if (+xhr.status === 200) {
            var $imgBox = this._getImgWrapByIndex(index);
            var imgUrls = res.data; // 从返回数据中获取图片url信息

            this._renderImg($imgBox, img, imgUrls);

            this._setImgs(index, {
                'state': DONE,
                'urls': imgUrls
            });

            // 自定义上传成功处理
            this.done();
        }
    };

    /**
     * 绘制缩略图
     *
     * @param {$} $imgWrap 图片容器Dom
     * @param {Object} img 图片
     * @param {Object|string} url 图片地址对象或图片地址
     * @param {string} url.bigImg 图片地址
     * @param {string} url.smallImg 图片缩略图地址
     * @private
     */
    exports._renderImg = function ($imgWrap, img, url) {
        // 优先使用FileReader读取
        if (window.FileReader) {
            var reader = new FileReader();

            reader.onload = function () {
                $imgWrap.append('<img data-role="img" src=' + this.result + '>');
            };

            reader.readAsDataURL(img);
            return;
        }

        // 返回仅一个url
        if (typeof url === 'string') {
            $imgWrap.append('<img data-role="img" '
                + 'src="' + url + '" '
                + 'data-src="' + url + '">');
            return;
        }

        // 返回原图和缩略图url
        $imgWrap.append('<img data-role="img" '
            + 'src="' + url.smallImg + '" '
            + 'data-src="' + url.bigImg + '">');
    };

    exports._failHandler = function (index, img, err) {

        this._setImgs(index, 'state', FAIL);
        this._getImgs(index, 'el').find('div[data-role=alert]').html(TPL_FAIL);
    };

    /**
     * 图片大小超出限制的处理
     */
    exports._overSize = function (index) {

        this._setImgs(index, 'state', OVERSIZE);
        this._getImgs(index, 'el').append(TPL_OVERSIZE);
    };

    /**
     * 上传成功回调
     */
    exports.done = function () {
        console.log('done');
    }

    /**
     * 获取相应序号的图片容器
     *
     * @param {number} index 图片序号
     * @return {$} 图片容器
     * @private
     */
    exports._getImgWrapByIndex = function (index) {
        return $('div[data-role="image-wrap"][data-id="' + index + '"]');
    };

    exports._retry = function (e) {
	var $alert = $(e.currentTarget);
        var $imgBox = $alert.closest('[data-role=image-wrap]');
        var index = $imgBox.attr('data-id');

        this._postImg(index, this._getImgs(index, 'file'));
    };

    /**
     * 删除图片
     *
     * @param {Object} e click event
     * @private
     */
    exports._deleteImg = function (e) {
        var $delBtn = $(e.currentTarget);
        var $imgBox = $delBtn.parent();
        var index = $imgBox.attr('data-id');

        this._setImgs(index, null);
        $imgBox.remove();
    };

    /**
     * 错误处理
     *
     * @param {Object} error error对象
     * @param {number} error.type 错误类型
     * @param {string} error.message 报错信息
     */
    exports.errorHandler = function (error) {
    };

    exports.getImgUrls = function () {
        var imgs = this._imgs;
        var urls = [];

        $.forEach(imgs, function (index, img) {
            if (img !== null) {
                urls.push(img.url);
            }
        });

        return urls;
    }

    /**
     * 获取上传状态
     * 状态说明：
     * 1，所有图片都上传成功
     * 2，有图片正在上传中
     * 3，没有正在上传的图片，但有图片上传失败或大小超限
     *
     * @return {number} 状态值
     */
    exports.getState = function () {
        var imgs = this._imgs;
        var state = DONE;

        $.forEach(imgs, function (index, img) {
            if (img) {
                if (img.state === PENDING) {
                    state = PENDING;
                    break;
                }

                if (img.state === FAIL || img.state === OVERSIZE) {
                    state = FAIL;
	        }
            }
        })

        return state;
    }

    /**
     * 入口函数
     *
     * @param {Object} param 自定义参数
     */
    exports.init = function (param) {

        $.extend(this.options, param);
        this.state = '';
        url = this.options.action;

        this._initDom();
        this._initEvent();
    };

    /**
     * 初始化Dom
     */
    exports._initDom = function () {
        // 初始化input
        $form = $(TPL_FORM);
        $(this.options.formContainer).append($form);
        // form = $form[0];
        this.form = $form;

        $input = $form.find('input');
        // 是否可多选
        if (this.options.multiple) {
            $input.attr('multiple', 'multiple');
        }

        this.input = $input;

        // 初始化图片容器
        $container = $(this.options.container);
        $container.attr('data-role', 'image-container');
        this.container = $container;
    };

    /**
     * 初始化dom事件
     */
    exports._initEvent = function () {
        // 上传input
        $input.on('change', this._onFileChange.bind(this));

        // 删除按钮
        this.container.on('click', 'span[data-role=delete]',
            this._deleteImg.bind(this));

        this.container.on('click', 'span[data-role=alert-fail]',
	    this._retry.bind(this));
    };

    return exports;
});
