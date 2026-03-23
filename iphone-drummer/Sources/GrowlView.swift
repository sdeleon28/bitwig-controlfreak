import SwiftUI

struct GrowlView: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.headline)
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.75))
            )
            .transition(.opacity.animation(.easeInOut(duration: 0.3)))
    }
}
