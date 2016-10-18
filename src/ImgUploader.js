/**
 * 移动端图片上传组件
 * 
 * @author Varsha 
 */

define(function (require) {

    var TPL_FORM = ''
		+'<form enctype="multipart/form-data" method="post">'
        +	'<input type="file" name="file" accept="image/*" data-role="file-input">'
        + '</form>';
    var TPL_OVERSIZE = '<span data-role="alert-oversize">图片过大</span>';
    var TPL_FAIL = '<span data-role="alert-fail">上传失败\n点击重试</span>';

    var ERR_IMG_NUM_BEYOND = 1;
    var INIT = 0;
    var PENDING = 1;
    var DONE = 2;
    var FAIL = 3;
    var OVERSIZE = 4;

    // 组件默认配置项
    var DEFAULT_OPTIONS = {
		// 上传表单容器，must
        formContainer: '', 

        // 图片容器, must
        container: '',

        // 图片上传地址, must
        action: '',

        // 上传图片数量上限
        maxNum: 8,

        // 文件选择，是否可多选
        multiple: true,

        // 上传图片大小上限
        maxSize: 5,

        // loading html模板
        loadingHtml: '...',

        // 删除按钮模板
        deleteHtml: 'x'
    };

    /**
     * 存储图片信息
     *
     * @param {number} index 图片序号
     * @param {Object|string} key 值对象|key
     * @param {*=} value 值
     */
    ImgUploader.prototype._setImgs = function (index, key, value) {

        if (key == null) {
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

    /**
     * 获取图片信息
     *
     * @param {number} index 图片序号
     * @param {string} key key
     * @return {*} 值
     */
    ImgUploader.prototype._getImgs = function (index, key) {
        return this._imgs[index][key];
    }

    /**
     * 上传图片
     *
     * @param {Object} e input file change事件
     */
	ImgUploader.prototype._doUpload = function (e) {
        var images = e.target.files;
        var imgLen = images.length;

        if (imgLen <= 0) {
            return;
        }

        if (imgLen + this._currIndex > this.options.maxNum) {
            this.errorHandler({type: ERR_IMG_NUM_BEYOND, message: '最多只能上传' + this.options.maxNum + '张图片'});
            return;
        }

        this._createImgBoxes(imgLen);

        this._uploadImages(images);
    };

    /**
     * 创建图片格子
     *
     * @param {number} len 图片数量
     * @private
     */
    ImgUploader.prototype._createImgBoxes = function (len) {
        var html = '';
        var imgIndex = this._currIndex;
        for (var i = 0; i < len; i++) {
            html += ''
				+ '<div data-role="image-wrap" data-id="' + imgIndex + '">'
                +     '<div data-role="alert" style="display: none;"></div>'
                +     '<span data-role="delete" data-id="' + (imgIndex++) + '">' + this.options.deleteHtml + '</span>'
                + '</div>';
        }

        this._container.append($(html));
    };

    /**
     * 上传图片
     *
     * @param {Array} images 要上传的图片数组
     */
    ImgUploader.prototype._uploadImages = function (images) {
        var me = this;
        $.each(images, function (index, item) {
            me._postImg(me._currIndex++, item);
        });
    };

    /**
     * 创建xhr
     *
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @return {Object} xhr
     */
    ImgUploader.prototype._createXhr = function (index, img) {
        var xhr = $.ajaxSettings.xhr();

        // 上传进度获取
        if (xhr.upload) {
            xhr.upload.addEventListener('progress', this._progressHandler.bind(this, index, img));
        }

		return xhr;
    };

    /**
     * 上传图片
     *
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @private
     */
    ImgUploader.prototype._postImg = function (index, img) {

        var el = this._getImgWrapByIndex(index);

        this._setImgs(index, {
            'file': img,
            'state': PENDING,
            'el': el,
            'alert': el.find('div[data-role=alert]')
        });

        // 图片超过最大限制
        if (img.size > this.options.maxSize * 1024 * 1024) {
            this._overSize(index);
            return;
        }

        var formData = new FormData(this._form[0]);
        formData.append('file', img);

        // 添加自定义字段
        var params = this.options.params;
		if (params instanceof Array) {
			params.forEach(function (value, key) {
                formData.append(key, value);
			});
		}

        var xhr = $.ajax({
            url: this.options.action,
            type: 'POST',
            xhr: this._createXhr.bind(this, index, img),
            beforeSend: this.beforeSendHandler.bind(this, index, img),
            success: this._completeHandler.bind(this, index, img),
            error: this._failHandler.bind(this, index, img),
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });

        this._setImgs(index, 'xhr', xhr);
    };

    /**
     * 进度事件处理
     *
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @param {Object} event 进度事件
     */
    ImgUploader.prototype._progressHandler = function (index, img, e) {
        if (e.lengthComputable) {
            percent = e.loaded / e.total;
            this._renderAlert(
				this._getImgs(index, 'alert'), 
                this.progressFormatter(percent)
			);
        }
    };

    /**
     * 开始上传的处理
     *
     * @param {number} index 图片序号
     */
    ImgUploader.prototype.beforeSendHandler = function (index) {
		this._renderAlert(this._getImgs(index, 'alert'), this.options.loadingHtml);
    };

    /**
     * 格式化进度
     *
     * @param {number} percent 进度小数
     * @return {string} 进度html片段
     */
    ImgUploader.prototype.progressFormatter = function (percent) {
        return percent.toFixed(2) * 100 + '%';
    };

    /**
     * 图片上传成功回调
     *
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @param {Object} res response
     * @private
     */
    ImgUploader.prototype._completeHandler = function (index, img, res) {

        if (+res.status !== 0) {
            this._failHandler(index, img, res);
            return;
        }

		var imgBox = this._getImgs(index, 'el');
		var imgUrls = res.data; // 从返回数据中获取图片url信息

		this._getImgs(index, 'alert').hide();
		this._renderImg(imgBox, img, imgUrls);

		this._setImgs(index, {
			state: DONE,
			urls: imgUrls
		});

		// 自定义上传成功处理
		this.onsuccess(index, img, res);
        
    };

    /**
     * 绘制缩略图
     *
     * @param {Object} imgWrap 图片容器Dom
     * @param {Blob} img 图片数据
     * @param {Object|string} url 图片地址对象或图片地址
     * @param {string} url.bigImg 图片地址
     * @param {string} url.smallImg 图片缩略图地址
     * @private
     */
    ImgUploader.prototype._renderImg = function (imgWrap, img, url) {
        // 优先使用FileReader读取
        if (window.FileReader) {
            var reader = new FileReader();

            reader.onload = function () {
                imgWrap.append('<img data-role="img" src=' + this.result + '>');
            };

            reader.readAsDataURL(img);
            return;
        }

		var smallImg = url;
		var bigImg = url;

		if (typeof url === 'object') {
			smallImg = url.smallImg;
			bigImg = url.bigImg;
		}
    
        imgWrap.append('<img data-role="img" '
            + 'src="' + smallImg + '" '
            + 'data-src="' + bigImg + '">');
    };

    /**
     * 渲染提示框
     *
     * @param {JQuery} alert 提示框容器
     * @param {string} tpl 提示文本
     * @private
     */
    ImgUploader.prototype._renderAlert = function (alert, tpl) {
        alert.html(tpl);
        alert.show();
	}

    /**
     * 上传失败回调
     *
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @param {Object=} res response
     * @private
     */
    ImgUploader.prototype._failHandler = function (index, img, res) {

        this._setImgs(index, 'state', FAIL);
        var alert = this._getImgs(index, 'alert');
        this._renderAlert(alert, TPL_FAIL);

        this.onfail(index, img, res);
    };

    /**
     * 图片大小超出限制的处理
     *
     * @param {number} index 图片序号
     * @private
     */
    ImgUploader.prototype._overSize = function (index) {

        this._setImgs(index, 'state', OVERSIZE);
        this._renderAlert(this._getImgs(index, 'alert'), TPL_OVERSIZE);
    };

    /**
     * 上传成功处理接口
     *
     * @event
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @param {Object} res response
     */
    ImgUploader.prototype.onsuccess = function (index, img, res) {
    }

    /**
     * 上传失败处理接口
     *
     * @event
     * @param {number} index 图片序号
     * @param {Blob} img 图片数据
     * @param {Object} res response
     */
    ImgUploader.prototype.onfail = function (index, img, res) {
    }

    /**
     * 获取相应序号的图片容器
     *
     * @param {number} index 图片序号
     * @return {JQuery} 图片容器
     * @private
     */
    ImgUploader.prototype._getImgWrapByIndex = function (index) {
        return $('div[data-role="image-wrap"][data-id="' + index + '"]');
    };

    /*
     * 重试上传
     *
     * @param {Object} e click event
     * @private
     */
    ImgUploader.prototype._retry = function (e) {
		var alert = $(e.currentTarget);
        var imgBox = alert.closest('[data-role=image-wrap]');
        var index = imgBox.attr('data-id');

        this._postImg(index, this._getImgs(index, 'file'));
    };

    /**
     * 删除图片
     *
     * @param {Object} e click event
     * @private
     */
    ImgUploader.prototype._deleteImg = function (e) {
        var delBtn = $(e.currentTarget);
        var imgBox = delBtn.parent();
        var index = imgBox.attr('data-id');

        var xhr = this._getImgs(index, 'xhr');
        if (xhr) {
            xhr.abort();
        }

        this._setImgs(index, null);
        imgBox.remove();
    };

    /**
     * 错误处理
     *
     * @event
     * @param {Object} error error对象
     * @param {number} error.type 错误类型
     * @param {string} error.message 报错信息
     */
    ImgUploader.prototype.onerror = function (error) {
    };

    /**
     * 获取上传完成图片url列表
     *
     * @public
     * @return {Array} 图片url数组
     */
    ImgUploader.prototype.getImgUrls = function () {
        return this._imgs.filter(function (img) {
            return img != null;
        });
    }

    /**
     * 获取上传状态
     * 状态说明：
     * 1，所有图片都上传成功
     * 2，有图片正在上传中
     * 3，没有正在上传的图片，但有图片上传失败或大小超限
     *
     * @public
     * @return {number} 状态值
     */
    ImgUploader.prototype.getState = function () {
        var imgs = this._imgs;

        if (!imgs || imgs.length === 0) {
            return INIT;
        }

        var state = DONE;

        imgs.forEach(function (img) {
            if (img == null) {
				return;
			}
			
			switch (img.state) {
				case PENDING:
					state = PENDING;
					return false;

				case FAIL:
				case OVERSIZE:
					state = FAIL;
					return false;
			}
        });

        return state;
    }


    /**
     * 图片上传组件 
     *
     * @class
     * @param {Object} options 自定义参数
     * @param {Object} options.formContainer 上传表单容器
     * @param {Object} options.container 图片容器
     * @param {string} options.action 图片上传地址
     * @param {number=} options.maxNum 上传图片数量上限(默认值8)
     * @param {boolean=} options.multiple 图片是否允许多选(默认值true)
     * @param {number=} options.maxSize 上传图片大小上限,单位M(默认值5M)
     * @param {string=} options.loadimgHtml loading html 模板(默认值'...')
     * @param {string=} options.deleteHtml 删除按钮模板(默认值'x')
     */
	function ImgUploader(options) {
        this.options = $.extend({}, DEFAULT_OPTIONS, options);

		this._imgs = []; // 存储图片信息对象
		this._currIndex = 0; // 当前图片序号

        this._initDOM();
        this._initEvent();
    };

    /**
     * 初始化DOM
     */
    ImgUploader.prototype._initDOM = function () {
        // 初始化input
        var form = $(TPL_FORM);
        $(this.options.formContainer).append(form);
        this._form = form;

        var input = form.find('input');
        // 是否可多选
        if (this.options.multiple) {
            input.attr('multiple', 'multiple');
        }

        this._input = input;

        // 初始化图片容器
        var container = $(this.options.container);
        container.attr('data-role', 'image-container');
        this._container = container;
    };

    /**
     * 初始化dom事件
     */
    ImgUploader.prototype._initEvent = function () {
        // 上传input
        this._input.on('change', this._doUpload.bind(this));

        // 删除按钮
		this._container.on(
			'click', 
			'span[data-role=delete]',
            this._deleteImg.bind(this)
		);

        this._container.on(
			'click', 
			'span[data-role=alert-fail]',
			this._retry.bind(this)
		);
    };

    return ImgUploader;
});
