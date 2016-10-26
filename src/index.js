/**
 * 上传图片Demo
 * @author Varsha
 * @date 16/4/10
 */

define(function (require) {

    var ImgUploader = require('ImgUploader');

    return {
        init: function () {
            var imgUploader = new ImgUploader({
                formContainer: '.input-wrap',
                container: '.main-wrap',
                action: '../mock/imgUp.json',
                maxNum: 3,
                error: function (err) {
                    console.log(err);
                }
            });

            window.imgUp = imgUploader;
        }
    };
});
